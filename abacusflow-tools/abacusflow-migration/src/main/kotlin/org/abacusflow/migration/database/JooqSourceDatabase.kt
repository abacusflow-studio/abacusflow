package org.abacusflow.migration.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.abacusflow.migration.config.DatabaseConfig
import org.jooq.DSLContext
import org.jooq.SQLDialect
import org.jooq.impl.DSL

/**
 * V1 只读数据库的 jOOQ 实现。
 * 使用 HikariCP 连接池，设置 readOnly 和 fetchSize，禁止全表加载到 JVM。
 */
class JooqSourceDatabase(
    config: DatabaseConfig,
) : SourceDatabase {
    private val dataSource: HikariDataSource =
        HikariConfig().apply {
            jdbcUrl = config.url
            username = config.username
            password = config.password
            schema = config.schema
            connectionTimeout = config.connectionTimeoutSeconds * 1000
            maximumPoolSize = 2
            minimumIdle = 1
            connectionTestQuery = "SELECT 1"
            leakDetectionThreshold = 60_000
            addDataSourceProperty("readOnly", "true")
        }.let { HikariDataSource(it) }

    override fun <T> read(block: (DSLContext) -> T): T {
        dataSource.connection.use { connection ->
            connection.autoCommit = false
            connection.isReadOnly = true
            connection.holdability = java.sql.ResultSet.CLOSE_CURSORS_AT_COMMIT
            val dsl = DSL.using(connection, SQLDialect.POSTGRES)
            return block(dsl)
        }
    }

    override fun close() {
        if (!dataSource.isClosed) {
            dataSource.close()
        }
    }
}
