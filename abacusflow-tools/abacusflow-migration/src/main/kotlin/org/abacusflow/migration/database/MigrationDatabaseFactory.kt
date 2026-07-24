package org.abacusflow.migration.database

import org.abacusflow.migration.config.DatabaseConfig

/**
 * 双数据库资源创建的工厂端口（Port），以及其 jOOQ 实现。
 *
 * 【设计目的与系统角色】
 * 迁移工具需要同时连接两个独立的 PostgreSQL 数据库（V1 源库和 V2 目标库）。
 * 本接口将"创建数据库连接"抽象为工厂方法，使得：
 * - 生产环境使用 [JooqMigrationDatabaseFactory] 创建真实的 jOOQ + HikariCP 连接；
 * - 集成测试可以传入 Mock 工厂，创建内存数据库（如 H2）的连接；
 * - 生命周期管理集中化：创建和关闭的职责在工厂和调用方之间明确划分。
 *
 * 【设计选择：不能复用业务应用的 Spring Bean 或 JPA EntityManager】
 * 迁移工具是独立运行的 CLI 应用，与 V2 的 Spring Boot 应用完全隔离，原因：
 * 1. 迁移账号需要 BYPASSRLS 权限，业务应用的数据库连接没有此权限；
 * 2. 迁移工具需要直接操作 JDBC 连接和 jOOQ DSLContext，
 *    而 JPA EntityManager 有自己的事务和缓存机制，会干扰迁移的精确控制；
 * 3. 迁移工具的连接池配置（大小、超时、只读等）与业务应用不同；
 * 4. 迁移工具可能需要在 V2 应用未启动时独立运行。
 *
 * 【Kotlin 语法：接口中的默认方法】
 * Kotlin 接口可以包含抽象方法和具体实现（与 Java 8+ 的 default 方法类似）。
 * 本接口定义了两个抽象工厂方法，由 [JooqMigrationDatabaseFactory] 实现。
 *
 * 【与其他模块的连接】
 * - 被 Main / CLI 入口调用，创建源库和目标库的数据库实例；
 * - 创建的 [SourceDatabase] 和 [TargetDatabase] 实例被注入到迁移引擎中；
 * - 使用 [DatabaseConfig] 中的连接参数。
 */
interface MigrationDatabaseFactory {
    /**
     * 创建并打开 V1 源库的只读数据库连接。
     *
     * @param config 源库连接配置
     * @return [SourceDatabase] 实例，调用方负责在完成后调用 close()
     */
    fun openSource(config: DatabaseConfig): SourceDatabase

    /**
     * 创建并打开 V2 目标库的读写数据库连接。
     *
     * @param config 目标库连接配置
     * @return [TargetDatabase] 实例，调用方负责在完成后调用 close()
     */
    fun openTarget(config: DatabaseConfig): TargetDatabase
}

/**
 * [MigrationDatabaseFactory] 的 jOOQ + HikariCP 实现。
 *
 * 【设计目的】
 * 使用 PostgreSQL JDBC 驱动 + jOOQ DSL + HikariCP 连接池实现数据库连接、
 * 事务管理和确定性的资源关闭。
 *
 * 【设计选择：简单委托】
 * 本类是薄封装，直接委托给 [JooqSourceDatabase] 和 [JooqTargetDatabase] 的构造函数。
 * 这样做的好处：
 * - 工厂方法集中了创建逻辑，未来如需添加连接池监控、日志等横切关注点，只需修改此处；
 * - 调用方通过接口编程，不依赖具体的实现类；
 * - 测试时可以替换为 Mock 工厂。
 *
 * 【Kotlin 语法：单表达式函数】
 * `override fun openSource(config: DatabaseConfig) = JooqSourceDatabase(config)`
 * 使用 `=` 而非 `{ return ... }` 的单表达式函数语法，更简洁。
 * 当函数体只有一个表达式时，Kotlin 推荐使用此语法。
 */
class JooqMigrationDatabaseFactory : MigrationDatabaseFactory {
    override fun openSource(config: DatabaseConfig): SourceDatabase = JooqSourceDatabase(config)

    override fun openTarget(config: DatabaseConfig): TargetDatabase = JooqTargetDatabase(config)
}
