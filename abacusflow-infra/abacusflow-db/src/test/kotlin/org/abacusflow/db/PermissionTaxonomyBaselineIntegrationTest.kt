package org.abacusflow.db

import org.abacusflow.user.PermissionScope
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.postgresql.util.PSQLException
import org.testcontainers.containers.PostgreSQLContainer
import java.sql.Connection
import java.sql.DriverManager
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PermissionTaxonomyBaselineIntegrationTest {
    private val postgres =
        PostgreSQLContainer<Nothing>("postgres:15-alpine").apply {
            withDatabaseName("permission_baseline_test")
            withUsername("migration_owner")
            withPassword("migration-password")
        }

    private lateinit var flyway: Flyway

    @BeforeAll
    fun initializeDatabase() {
        postgres.start()
        flyway =
            Flyway.configure()
                .dataSource(postgres.jdbcUrl, postgres.username, postgres.password)
                .locations("classpath:db/migration")
                .load()
        flyway.migrate()
        ownerConnection().use { connection ->
            connection.createStatement().use { statement ->
                statement.execute(
                    """
                    CREATE ROLE product_category_baseline_app LOGIN PASSWORD 'runtime-password'
                        NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS;
                    GRANT abacusflow_runtime TO product_category_baseline_app;
                    """.trimIndent(),
                )
            }
        }
    }

    @AfterAll
    fun stopDatabase() {
        postgres.stop()
    }

    @Test
    fun `fresh database applies only schema and seed migrations`() {
        assertEquals(listOf("001", "002", "003"), flyway.info().applied().map { it.version.version })

        ownerConnection().use { connection ->
            assertEquals(51, queryLong(connection, "SELECT count(*) FROM permission"))
            assertEquals(10, queryLong(connection, "SELECT count(*) FROM permission WHERE scope = 'PLATFORM'"))
            assertEquals(8, queryLong(connection, "SELECT count(*) FROM permission WHERE scope = 'TENANT'"))
            assertEquals(33, queryLong(connection, "SELECT count(*) FROM permission WHERE scope = 'BUSINESS'"))
            connection.createStatement().use { statement ->
                statement.executeQuery("SELECT name, scope FROM permission").use { result ->
                    while (result.next()) {
                        assertEquals(
                            result.getString("scope"),
                            PermissionScope.fromName(result.getString("name")).name,
                        )
                    }
                }
            }
        }
    }

    @Test
    fun `seeded platform and tenant roles have final permission boundaries`() {
        ownerConnection().use { connection ->
            assertEquals(10, rolePermissionCount(connection, "platform-admin", platform = true))
            assertEquals(41, rolePermissionCount(connection, "admin"))
            assertEquals(33, rolePermissionCount(connection, "operator"))
            assertEquals(10, rolePermissionCount(connection, "reader"))
            assertEquals(
                0,
                queryLong(
                    connection,
                    "SELECT count(*) FROM tenant_role_permission link " +
                        "JOIN permission ON permission.id = link.permission_id " +
                        "WHERE permission.scope = 'PLATFORM'",
                ),
            )
            assertEquals(
                0,
                queryLong(
                    connection,
                    "SELECT count(*) FROM tenant_role_permission link " +
                        "JOIN tenant_role role ON role.id = link.role_id " +
                        "JOIN permission ON permission.id = link.permission_id " +
                        "WHERE role.name IN ('reader', 'operator') AND permission.scope = 'TENANT'",
                ),
            )
            assertEquals(1, queryLong(connection, "SELECT count(*) FROM platform_user_role"))
            assertEquals(1, queryLong(connection, "SELECT count(*) FROM tenant_membership_role"))
        }
    }

    @Test
    fun `seeded identity sequences continue after existing rows`() {
        ownerConnection().use { connection ->
            connection.autoCommit = false
            val seededMax = queryLong(connection, "SELECT max(id) FROM user_account")
            val nextId =
                connection.prepareStatement(
                    "INSERT INTO user_account (age, enabled, locked, name, password) " +
                        "VALUES (20, TRUE, FALSE, 'sequence-check', '!') RETURNING id",
                ).use { statement ->
                    statement.executeQuery().use { result ->
                        result.next()
                        result.getLong(1)
                    }
                }
            assertTrue(nextId > seededMax)
            connection.rollback()
        }
    }

    @Test
    fun `fresh product category baseline starts empty and supports a tenant-scoped forest`() {
        val tenantBId =
            ownerConnection().use { connection ->
                assertEquals(0, queryLong(connection, "SELECT count(*) FROM product_category WHERE tenant_id = 1"))
                connection.prepareStatement("INSERT INTO tenant (name) VALUES ('category-baseline-b') RETURNING id").use { statement ->
                    statement.executeQuery().use { result ->
                        result.next()
                        result.getLong(1)
                    }
                }
            }

        runtimeConnection().use { connection ->
            connection.autoCommit = false

            setTenant(connection, 1)
            val tenantATopLevelId = insertCategory(connection, "食品", 1)
            assertTrue(tenantATopLevelId >= 100)
            connection.commit()

            setTenant(connection, 1)
            assertFailsWith<PSQLException> { insertCategory(connection, "食品", 1) }
            connection.rollback()

            setTenant(connection, tenantBId)
            val tenantBTopLevelId = insertCategory(connection, "食品", tenantBId)
            val tenantBChildId = insertCategory(connection, "饮料", tenantBId, tenantBTopLevelId)
            assertTrue(tenantBChildId > tenantBTopLevelId)
            connection.commit()

            setTenant(connection, 1)
            assertEquals(1, queryLong(connection, "SELECT count(*) FROM product_category"))
            assertEquals(
                1,
                queryLong(connection, "SELECT count(*) FROM product_category WHERE parent_id IS NULL"),
            )
            connection.rollback()

            setTenant(connection, tenantBId)
            assertEquals(2, queryLong(connection, "SELECT count(*) FROM product_category"))
            assertEquals(
                tenantBTopLevelId,
                queryLong(connection, "SELECT parent_id FROM product_category WHERE id = $tenantBChildId"),
            )
            connection.rollback()
        }
    }

    private fun rolePermissionCount(
        connection: Connection,
        roleName: String,
        platform: Boolean = false,
    ): Long =
        if (platform) {
            queryLong(
                connection,
                "SELECT count(*) FROM platform_role_permission link " +
                    "JOIN platform_role role ON role.id = link.platform_role_id WHERE role.name = '$roleName'",
            )
        } else {
            queryLong(
                connection,
                "SELECT count(*) FROM tenant_role_permission link " +
                    "JOIN tenant_role role ON role.id = link.role_id WHERE role.name = '$roleName' AND role.tenant_id = 1",
            )
        }

    private fun queryLong(
        connection: Connection,
        sql: String,
    ): Long =
        connection.createStatement().use { statement ->
            statement.executeQuery(sql).use { result ->
                result.next()
                result.getLong(1)
            }
        }

    private fun insertCategory(
        connection: Connection,
        name: String,
        tenantId: Long,
        parentId: Long? = null,
    ): Long =
        connection.prepareStatement(
            "INSERT INTO product_category (name, tenant_id, parent_id) VALUES (?, ?, ?) RETURNING id",
        ).use { statement ->
            statement.setString(1, name)
            statement.setLong(2, tenantId)
            if (parentId == null) {
                statement.setNull(3, java.sql.Types.BIGINT)
            } else {
                statement.setLong(3, parentId)
            }
            statement.executeQuery().use { result ->
                result.next()
                result.getLong(1)
            }
        }

    private fun setTenant(
        connection: Connection,
        tenantId: Long,
    ) {
        connection.prepareStatement("SELECT set_config('app.tenant_id', ?, true)").use { statement ->
            statement.setString(1, tenantId.toString())
            statement.execute()
        }
    }

    private fun ownerConnection(): Connection = DriverManager.getConnection(postgres.jdbcUrl, postgres.username, postgres.password)

    private fun runtimeConnection(): Connection =
        DriverManager.getConnection(postgres.jdbcUrl, "product_category_baseline_app", "runtime-password")
}
