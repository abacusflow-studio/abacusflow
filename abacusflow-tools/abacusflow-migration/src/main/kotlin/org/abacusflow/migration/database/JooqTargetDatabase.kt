package org.abacusflow.migration.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.abacusflow.migration.config.DatabaseConfig
import org.jooq.DSLContext
import org.jooq.SQLDialect
import org.jooq.impl.DSL

/**
 * [TargetDatabase] 接口的 jOOQ + HikariCP 实现，是 V2 目标库的读写适配器。
 *
 * 【设计目的与系统角色】
 * 本类是六边形架构中的"适配器"（Adapter），将 [TargetDatabase] 端口定义的读写契约
 * 落地为具体的 JDBC 连接 + jOOQ DSLContext 实现。它负责：
 * 1. 创建和管理 HikariCP 连接池；
 * 2. 为 read 操作提供只读 DSLContext；
 * 3. 为 transaction 操作提供带事务管理的 DSLContext（手动 commit/rollback）；
 * 4. 在对象关闭时释放连接池资源。
 *
 * 【连接池配置详解】
 * - maximumPoolSize = 3：目标库需要读写，并发需求比源库略高。3 个连接支持：
 *   一个用于当前事务写入，一个用于独立事务（error/run 记录），一个作为备用。
 * - minimumIdle = 1：空闲时至少保留 1 个连接，避免冷启动延迟。
 * - connectionTestQuery = "SELECT 1"：连接池验证查询。
 * - leakDetectionThreshold = 60_000 (60秒)：连接泄漏检测阈值。
 * - 没有设置 readOnly 属性：目标库需要写入，连接不能设为只读。
 *
 * 【与 JooqSourceDatabase 的对比】
 * | 特性                | JooqSourceDatabase       | JooqTargetDatabase        |
 * |---------------------|--------------------------|---------------------------|
 * | 连接池大小           | 2                        | 3                         |
 * | readOnly 属性        | true                     | 不设置                     |
 * | read 方法            | 有（只读+游标模式）        | 有（无游标模式特殊设置）     |
 * | transaction 方法     | 无                       | 有（手动 commit/rollback） |
 * | holdability 设置     | CLOSE_CURSORS_AT_COMMIT  | 不设置                     |
 * | BYPASSRLS 权限       | 不需要                   | 迁移账号必须拥有            |
 *
 * 【BYPASSRLS 权限说明】
 * V2 系统使用 PostgreSQL 的行级安全策略（Row Level Security, RLS）实现多租户隔离。
 * 正常的业务查询会自动受 RLS 约束，只能看到当前租户的数据。
 * 但迁移工具需要写入所有租户的数据，必须绕过 RLS，因此迁移账号需要 BYPASSRLS 权限：
 *   ALTER ROLE migration_user BYPASSRLS;
 * 这也是迁移工具不使用 V2 业务应用的 Spring Bean / JPA EntityManager 的原因之一——
 * 那些组件受 RLS 约束，无法完成跨租户的数据写入。
 *
 * 【Kotlin 语法：HikariConfig().apply { ... }.let { HikariDataSource(it) }】
 * 与 [JooqSourceDatabase] 相同的惯用法，详见那里的注释。
 *
 * 【与其他模块的连接】
 * - 由 [JooqMigrationDatabaseFactory.openTarget] 创建；
 * - 被 MigrationTask 实现类通过 [TargetDatabase.transaction] 接口调用写入业务数据；
 * - 被 [org.abacusflow.migration.checkpoint.JooqMigrationCheckpointRepository] 调用
 *   （共享业务批次的事务 DSLContext）；
 * - 被 [org.abacusflow.migration.error.JooqMigrationErrorRepository] 和
 *   [org.abacusflow.migration.run.JooqMigrationRunRepository] 调用
 *   （各自开启独立事务）。
 */
class JooqTargetDatabase(
    config: DatabaseConfig,
) : TargetDatabase {
    /**
     * HikariCP 连接池数据源，在类初始化时创建。
     *
     * 与源库不同，目标库不设置 readOnly 属性，因为需要写入数据。
     * 连接池大小为 3，比源库多 1 个，以支持业务写入和元数据记录的并发需求。
     */
    private val dataSource: HikariDataSource =
        HikariConfig().apply {
            jdbcUrl = config.url
            username = config.username
            password = config.password
            schema = config.schema
            // 将秒转换为毫秒，HikariCP 的 connectionTimeout 单位是毫秒
            connectionTimeout = config.connectionTimeoutSeconds * 1000
            maximumPoolSize = 3
            minimumIdle = 1
            connectionTestQuery = "SELECT 1"
            leakDetectionThreshold = 60_000
        }.let { HikariDataSource(it) }

    /**
     * 在目标库的连接上执行只读查询。
     *
     * 【与 JooqSourceDatabase.read 的区别】
     * - 不设置 isReadOnly=true：目标库的 read 可能用于事务内的查询（如检查记录是否存在），
     *   设置只读会阻止后续的写操作；
     * - 不设置 CLOSE_CURSORS_AT_COMMIT：目标库的 read 通常查询少量数据（如按 ID 查找），
     *   不需要游标模式；
     * - 仍然设置 autoCommit=false：保持与 transaction 方法的一致性。
     *
     * 【Kotlin 语法：.use {} 自动资源管理】
     * 与 [JooqSourceDatabase] 相同，use 确保连接在使用后自动归还连接池。
     */
    override fun <T> read(block: (DSLContext) -> T): T {
        dataSource.connection.use { connection ->
            connection.autoCommit = false
            val dsl = DSL.using(connection, SQLDialect.POSTGRES)
            return block(dsl)
        }
    }

    /**
     * 在目标库的连接上执行事务操作，手动管理 commit 和 rollback。
     *
     * 【设计选择：手动事务管理而非 jOOQ 内置事务】
     * jOOQ 提供了 DSLContext.transactionResult() 等内置事务 API，但本类选择手动管理，
     * 原因：
     * 1. 需要精确控制 commit/rollback 的时机，与业务逻辑紧密配合；
     * 2. 需要将同一个 DSLContext（绑定到同一个 Connection）传递给多个仓储，
     *    确保 checkpoint 和业务数据共享同一事务；
     * 3. jOOQ 的内置事务 API 会创建新的 Connection，无法满足共享事务的需求。
     *
     * 【事务流程】
     * 1. 从连接池借出连接，设置 autoCommit=false（开启手动事务模式）；
     * 2. 创建绑定到该连接的 DSLContext；
     * 3. 执行 block（业务写入 + checkpoint 更新）；
     * 4. block 正常返回时，手动 commit；
     * 5. block 抛出异常时，手动 rollback；
     * 6. use 块结束时自动归还连接到连接池。
     *
     * 【Kotlin 语法：try-catch 与 addSuppressed】
     * - rollback 本身也可能抛异常（如连接已断开），此时不能让 rollback 异常
     *   覆盖原始的业务异常；
     * - `e.addSuppressed(rollbackEx)` 将 rollback 异常作为被抑制的异常附加到原始异常上，
     *   这是 Java 7+ 引入的 suppressed exceptions 机制，Kotlin 完全支持；
     *   调试时可以看到完整的异常链：原始异常 + rollback 异常。
     *
     * 【关键约束：checkpoint 共享此事务】
     * 调用方必须将此方法提供的 DSLContext 传递给 checkpoint 仓储的 save 方法：
     *   target.transaction { dsl ->
     *       writeBusinessData(dsl, batch)           // 业务写入
     *       checkpointRepo.save(dsl, newCheckpoint)  // 共享同一事务
     *   }  // commit 时业务数据和 checkpoint 原子性地一起持久化
     * 如果 checkpoint 使用独立事务，可能导致数据不一致（详见 [TargetDatabase] 接口注释）。
     */
    override fun <T> transaction(block: (DSLContext) -> T): T {
        dataSource.connection.use { connection ->
            connection.autoCommit = false
            val dsl = DSL.using(connection, SQLDialect.POSTGRES)
            try {
                val result = block(dsl)
                connection.commit()
                return result
            } catch (e: Exception) {
                try {
                    connection.rollback()
                } catch (rollbackEx: Exception) {
                    // rollback 失败时，将异常附加到原始异常，不覆盖原始异常
                    e.addSuppressed(rollbackEx)
                }
                throw e
            }
        }
    }

    /**
     * 关闭连接池，释放所有资源。
     *
     * 【设计选择：先检查 isClosed】
     * 与 [JooqSourceDatabase.close] 相同，先检查避免重复关闭的警告。
     */
    override fun close() {
        if (!dataSource.isClosed) {
            dataSource.close()
        }
    }
}
