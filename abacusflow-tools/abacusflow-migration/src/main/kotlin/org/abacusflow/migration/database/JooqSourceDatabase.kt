package org.abacusflow.migration.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.abacusflow.migration.config.DatabaseConfig
import org.jooq.DSLContext
import org.jooq.SQLDialect
import org.jooq.impl.DSL

/**
 * [SourceDatabase] 接口的 jOOQ + HikariCP 实现，是 V1 源库的只读适配器。
 *
 * 【设计目的与系统角色】
 * 本类是六边形架构中的"适配器"（Adapter），将 [SourceDatabase] 端口定义的只读查询契约
 * 落地为具体的 JDBC 连接 + jOOQ DSLContext 实现。它负责：
 * 1. 创建和管理 HikariCP 连接池；
 * 2. 为每次 read 操作提供配置好的只读 DSLContext；
 * 3. 在对象关闭时释放连接池资源。
 *
 * 【连接池配置详解】
 * - maximumPoolSize = 2：源库只需读取，并发需求低。2 个连接足以支持：
 *   一个用于当前正在执行的查询，一个作为备用。
 * - minimumIdle = 1：空闲时至少保留 1 个连接，避免冷启动延迟。
 * - connectionTestQuery = "SELECT 1"：连接池验证查询，确保连接有效。
 * - leakDetectionThreshold = 60_000 (60秒)：如果连接被借出超过 60 秒未归还，
 *   HikariCP 会记录泄漏警告。迁移查询可能耗时较长，60 秒是合理的阈值。
 * - addDataSourceProperty("readOnly", "true")：在连接级别设置只读标志，
 *   PostgreSQL 驱动会将此传递给数据库，数据库可优化查询执行计划。
 *   这也是防止误写源库的第二道防线（接口层面 + 连接层面双重保障）。
 *
 * 【Kotlin 语法：HikariConfig().apply { ... }.let { HikariDataSource(it) }】
 * 这是一个常见的 Kotlin 惯用法，组合了 apply 和 let 两个作用域函数：
 *
 * - `apply { ... }`：在 HikariConfig 实例的上下文中执行代码块，
 *   块内的 `jdbcUrl = ...` 等价于 `this.jdbcUrl = ...`。
 *   apply 返回接收者自身（即配置好的 HikariConfig），适合用于对象初始化。
 *
 * - `.let { HikariDataSource(it) }`：将 apply 的结果作为参数传给 let 的 Lambda，
 *   `it` 指代配置好的 HikariConfig，用它创建 HikariDataSource。
 *   let 返回 Lambda 的结果（即 HikariDataSource），适合用于类型转换。
 *
 * 整个链式调用的效果等价于：
 *   val hikariConfig = HikariConfig()
 *   hikariConfig.jdbcUrl = config.url
 *   hikariConfig.username = config.username
 *   ... (更多配置)
 *   val dataSource = HikariDataSource(hikariConfig)
 * 但更简洁，且避免了临时变量的命名。
 *
 * 【Kotlin 语法：.use {} 自动资源管理】
 * `dataSource.connection.use { connection -> ... }` 中的 use 是 Kotlin 标准库的扩展函数，
 * 等价于 Java 的 try-with-resources：
 * - 在 block 执行前获取资源（Connection）；
 * - 在 block 执行后（无论正常还是异常）自动调用 connection.close()；
 * - 确保连接不会因异常而泄漏。
 * 任何实现了 java.lang.AutoCloseable 的对象都可以使用 .use {}。
 *
 * 【游标模式：fetchSize + autoCommit=false + CLOSE_CURSORS_AT_COMMIT】
 * PostgreSQL JDBC 驱动默认会将查询结果全部加载到 JVM 内存。对于大表迁移，这会导致 OOM。
 * 启用游标模式需要三个条件同时满足：
 * 1. autoCommit = false：游标模式只在事务内有效；
 * 2. fetchSize > 0：告诉驱动每次从服务器拉取多少行（在 DSLContext 层面设置）；
 * 3. holdability = CLOSE_CURSORS_AT_COMMIT：事务提交时关闭游标，释放服务器端资源。
 * 本类在 read 方法中设置了条件 1 和 3，fetchSize 在 DSLContext 创建时由调用者配置。
 *
 * 【与其他模块的连接】
 * - 由 [JooqMigrationDatabaseFactory.openSource] 创建；
 * - 被 MigrationTask 实现类通过 [SourceDatabase.read] 接口调用；
 * - 使用 [DatabaseConfig] 中的连接参数初始化 HikariCP。
 */
class JooqSourceDatabase(
    config: DatabaseConfig,
) : SourceDatabase {
    /**
     * HikariCP 连接池数据源，在类初始化时创建。
     *
     * 【Kotlin 语法：私有属性 + 初始化表达式】
     * `private val dataSource: HikariDataSource = ...` 将连接池声明为不可变私有属性，
     * 整个生命周期内只创建一次，所有 read 操作共享同一个连接池。
     */
    private val dataSource: HikariDataSource =
        HikariConfig().apply {
            jdbcUrl = config.url
            username = config.username
            password = config.password
            schema = config.schema
            // 将秒转换为毫秒，HikariCP 的 connectionTimeout 单位是毫秒
            connectionTimeout = config.connectionTimeoutSeconds * 1000
            maximumPoolSize = 2
            minimumIdle = 1
            connectionTestQuery = "SELECT 1"
            leakDetectionThreshold = 60_000
            // 在连接级别设置只读，PostgreSQL 驱动会传递给数据库
            addDataSourceProperty("readOnly", "true")
        }.let { HikariDataSource(it) }

    /**
     * 在源库的只读连接上执行查询操作。
     *
     * 【执行流程】
     * 1. 从连接池借出一个连接；
     * 2. 设置 autoCommit=false（启用游标模式的前提）；
     * 3. 设置 isReadOnly=true（双重只读保障）；
     * 4. 设置 CLOSE_CURSORS_AT_COMMIT（游标模式配合）；
     * 5. 创建 jOOQ DSLContext 并执行 block；
     * 6. use 块结束时自动归还连接到连接池。
     *
     * 【Kotlin 语法：DSL.using(connection, SQLDialect.POSTGRES)】
     * jOOQ 的 DSL.using() 工厂方法创建一个绑定到特定 JDBC 连接的 DSLContext。
     * 指定 SQLDialect.POSTGRES 让 jOOQ 生成 PostgreSQL 方言的 SQL。
     * 因为 DSLContext 绑定了连接，所以 block 内的所有查询都在同一个连接上执行，
     * 保证了游标模式的一致性。
     */
    override fun <T> read(block: (DSLContext) -> T): T {
        dataSource.connection.use { connection ->
            connection.autoCommit = false
            connection.isReadOnly = true
            connection.holdability = java.sql.ResultSet.CLOSE_CURSORS_AT_COMMIT
            val dsl = DSL.using(connection, SQLDialect.POSTGRES)
            return block(dsl)
        }
    }

    /**
     * 关闭连接池，释放所有资源。
     *
     * 【设计选择：先检查 isClosed】
     * HikariDataSource.close() 是幂等的，但先检查 isClosed 可以避免
     * 重复关闭时的日志警告和潜在异常。
     */
    override fun close() {
        if (!dataSource.isClosed) {
            dataSource.close()
        }
    }
}
