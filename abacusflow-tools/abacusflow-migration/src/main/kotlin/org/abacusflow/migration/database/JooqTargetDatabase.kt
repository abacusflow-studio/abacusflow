package org.abacusflow.migration.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.abacusflow.migration.config.DatabaseConfig
import org.jooq.DSLContext
import org.jooq.SQLDialect
import org.jooq.impl.DSL

/**
 * V2 读写数据库的 jOOQ 实现。
 * 每批业务写入和同批 checkpoint 必须共享这里提供的同一个事务。
 * 迁移账号需拥有 BYPASSRLS 权限以绕过 V2 的行级安全策略。
 */
class JooqTargetDatabase(
    config: DatabaseConfig,
) : TargetDatabase {
    private val dataSource: HikariDataSource =
        HikariConfig().apply {
            jdbcUrl = config.url
            username = config.username
            password = config.password
            schema = config.schema
            connectionTimeout = config.connectionTimeoutSeconds * 1000
            maximumPoolSize = 3
            minimumIdle = 1
            connectionTestQuery = "SELECT 1"
            leakDetectionThreshold = 60_000
        }.let { HikariDataSource(it) }

    override fun <T> read(block: (DSLContext) -> T): T {
        dataSource.connection.use { connection ->
            connection.autoCommit = false
            val dsl = DSL.using(connection, SQLDialect.POSTGRES)
            return block(dsl)
        }
    }

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
                    e.addSuppressed(rollbackEx)
                }
                throw e
            }
        }
    }

    override fun close() {
        if (!dataSource.isClosed) {
            dataSource.close()
        }
    }
}
