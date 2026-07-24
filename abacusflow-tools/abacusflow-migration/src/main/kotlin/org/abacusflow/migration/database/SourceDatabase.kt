package org.abacusflow.migration.database

import org.jooq.DSLContext

/**
 * V1 源库的只读数据库访问端口（Port）。
 *
 * 【设计目的与系统角色】
 * 在六边形架构（端口-适配器模式）中，本接口定义了迁移工具对 V1 旧数据库的访问契约。
 * 迁移工具只需要从源库读取数据，不需要写入，因此接口设计为纯只读。
 * 实现类（如 [JooqSourceDatabase]）是适配器，负责具体的 JDBC/jOOQ 连接和资源管理。
 *
 * 【设计选择：只提供 read 方法】
 * - 源库是生产中的旧系统数据库，迁移过程绝不能修改源库数据；
 * - 没有提供 write/transaction 方法，从接口层面强制只读语义；
 * - 实现类会进一步在 JDBC 连接层面设置 readOnly=true，形成双重保障。
 *
 * 【设计选择：泛型 Lambda 参数】
 * `fun <T> read(block: (DSLContext) -> T): T` 是 Kotlin 中常见的"Loan Pattern"：
 * - 调用者只需关心"用 DSLContext 做什么"，不必关心连接的获取和释放；
 * - 实现类负责在 block 执行前获取连接、创建 DSLContext，执行后自动关闭连接；
 * - 泛型 T 让调用者可以返回任意类型的结果（查询结果、统计值等）。
 * 这与 Java 的 try-with-resources 或 Kotlin 的 .use {} 是同一思路，但更加灵活。
 *
 * 【Kotlin 语法：泛型方法与函数类型参数】
 * - `<T>` 是泛型类型参数，由调用处的返回值类型推断；
 * - `block: (DSLContext) -> T` 是函数类型参数，接收 DSLContext 返回 T；
 * - 调用示例：`val count = sourceDb.read { dsl -> dsl.fetchCount(SOME_TABLE) }`
 *
 * 【继承 AutoCloseable】
 * 实现 AutoCloseable 表示本接口持有需要显式释放的资源（如 HikariCP 连接池）。
 * 配合 Kotlin 的 .use {} 可以确保资源在使用后关闭：
 *   sourceDb.use { db -> db.read { ... } }
 *
 * 【与其他模块的连接】
 * - 由 [MigrationDatabaseFactory.openSource] 创建；
 * - 被各 MigrationTask 实现类调用，读取 V1 数据；
 * - 与 [TargetDatabase] 对称：Source 只读，Target 读写。
 */
interface SourceDatabase : AutoCloseable {
    /**
     * 在源库的只读 DSLContext 上执行查询操作。
     *
     * 实现保证：
     * - 连接为 autoCommit=false + readOnly=true，支持游标模式读取；
     * - block 执行完毕后连接自动归还连接池；
     * - 不提供事务支持（只读无需事务）。
     *
     * @param block 使用 DSLContext 执行查询的 Lambda
     * @return block 的返回值
     */
    fun <T> read(block: (DSLContext) -> T): T
}
