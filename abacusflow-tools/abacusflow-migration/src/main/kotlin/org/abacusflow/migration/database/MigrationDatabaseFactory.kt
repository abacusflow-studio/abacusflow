package org.abacusflow.migration.database

import org.abacusflow.migration.config.DatabaseConfig

/** 双数据库资源创建端口；不能复用业务应用的 Spring Bean 或 JPA EntityManager。 */
interface MigrationDatabaseFactory {
    fun openSource(config: DatabaseConfig): SourceDatabase

    fun openTarget(config: DatabaseConfig): TargetDatabase
}

/** 使用 PostgreSQL JDBC + jOOQ + HikariCP 实现连接、事务和确定性的资源关闭。 */
class JooqMigrationDatabaseFactory : MigrationDatabaseFactory {
    override fun openSource(config: DatabaseConfig): SourceDatabase = JooqSourceDatabase(config)

    override fun openTarget(config: DatabaseConfig): TargetDatabase = JooqTargetDatabase(config)
}
