package org.abacusflow.migration.schema

import org.abacusflow.migration.config.DatabaseConfig
import org.abacusflow.migration.database.JooqTargetDatabase
import org.testcontainers.containers.PostgreSQLContainer
import java.sql.DriverManager
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class FlywayTargetSchemaMigratorTest {
    @Test
    fun `empty target is initialized and a second migration is idempotent`() {
        val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine")
        postgres.start()
        try {
            val config =
                DatabaseConfig(
                    url = postgres.jdbcUrl,
                    username = postgres.username,
                    password = postgres.password,
                    schema = TARGET_SCHEMA,
                    connectionTimeoutSeconds = 10,
                )
            val migrator = FlywayTargetSchemaMigrator(config)
            // 组合根会先创建 target 连接池。这里使用尚不存在的 schema 覆盖同一顺序。
            val target = JooqTargetDatabase(config)
            try {
                migrator.migrate()
                assertInitialized(postgres)

                // Flyway 根据 schema history 判断无待执行版本，重复调用不应重复建表/写种子数据。
                migrator.migrate()
                assertInitialized(postgres)

                target.read { dsl ->
                    assertEquals(TARGET_SCHEMA, dsl.fetchValue("SELECT current_schema()"))
                    assertEquals(1, dsl.fetchCount(org.jooq.impl.DSL.table("tenant")))
                }
            } finally {
                target.close()
            }
        } finally {
            postgres.stop()
        }
    }

    private fun assertInitialized(postgres: PostgreSQLContainer<Nothing>) {
        DriverManager.getConnection(postgres.jdbcUrl, postgres.username, postgres.password).use { connection ->
            connection.createStatement().use { statement ->
                statement.executeQuery("SELECT to_regclass('$TARGET_SCHEMA.tenant')").use { result ->
                    result.next()
                    assertNotNull(result.getString(1))
                }
                statement.executeQuery(
                    "SELECT COUNT(*) FROM $TARGET_SCHEMA.flyway_schema_history WHERE success AND version IS NOT NULL",
                ).use { result ->
                    result.next()
                        assertEquals(3, result.getInt(1))
                }
                statement.executeQuery("SELECT COUNT(*) FROM $TARGET_SCHEMA.tenant WHERE name = 'default'").use { result ->
                    result.next()
                    assertEquals(1, result.getInt(1))
                }
            }
        }
    }

    private companion object {
        const val TARGET_SCHEMA = "v2_auto"
    }
}
