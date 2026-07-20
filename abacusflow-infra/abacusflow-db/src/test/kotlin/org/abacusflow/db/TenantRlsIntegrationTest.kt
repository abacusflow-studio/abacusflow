package org.abacusflow.db

import org.flywaydb.core.Flyway
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.postgresql.util.PSQLException
import org.testcontainers.containers.PostgreSQLContainer
import java.sql.Connection
import java.sql.DriverManager
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CountDownLatch
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class TenantRlsIntegrationTest {
    private val postgres =
        PostgreSQLContainer<Nothing>("postgres:15-alpine").apply {
            withDatabaseName("abacusflow_rls_test")
            withUsername("migration_owner")
            withPassword("migration-password")
        }

    private lateinit var tenantA: SeedTenant
    private lateinit var tenantB: SeedTenant
    private var inventoryUnitId: Long = 0

    @BeforeAll
    fun setUpDatabase() {
        postgres.start()
        Flyway.configure()
            .dataSource(postgres.jdbcUrl, postgres.username, postgres.password)
            .locations("classpath:db/migration")
            .load()
            .migrate()

        ownerConnection().use { connection ->
            connection.createStatement().use { statement ->
                statement.execute(
                    """
                    CREATE ROLE abacusflow_test_app LOGIN PASSWORD 'runtime-password'
                        NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS;
                    GRANT abacusflow_runtime TO abacusflow_test_app;
                    """.trimIndent(),
                )
            }
            tenantA = seedTenant(connection, "rls-tenant-a", "RLS-A")
            tenantB = seedTenant(connection, "rls-tenant-b", "RLS-B")
            inventoryUnitId = seedInventoryUnit(connection, tenantA, 10)
        }
    }

    @AfterAll
    fun stopDatabase() {
        postgres.stop()
    }

    @Test
    fun `runtime identity is restricted and RLS isolates unqualified SQL`() {
        runtimeConnection().use { connection ->
            connection.autoCommit = false

            assertFalse(queryBoolean(connection, "SELECT rolsuper FROM pg_roles WHERE rolname = current_user"))
            assertFalse(queryBoolean(connection, "SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user"))
            assertFailsWith<PSQLException> {
                connection.createStatement().use { statement ->
                    statement.execute("CREATE TABLE runtime_must_not_create (id BIGINT)")
                }
            }
            connection.rollback()

            assertFailsWith<PSQLException> {
                connection.createStatement().use { statement -> statement.execute("TRUNCATE TABLE product") }
            }
            connection.rollback()

            assertEquals(0, queryInt(connection, "SELECT count(*) FROM product"))

            setTenant(connection, tenantA.id)
            assertEquals(listOf("RLS-A"), queryStrings(connection, "SELECT name FROM product ORDER BY name"))
            assertFailsWith<PSQLException> {
                connection.createStatement().use { statement ->
                    statement.executeUpdate(
                        """
                        INSERT INTO product (name, barcode, unit, enabled, category_id, tenant_id)
                        VALUES ('forged', 'forged-barcode', 'PIECE', TRUE, ${tenantB.categoryId}, ${tenantB.id})
                        """.trimIndent(),
                    )
                }
            }
            connection.rollback()

            setTenant(connection, tenantB.id)
            assertEquals(listOf("RLS-B"), queryStrings(connection, "SELECT name FROM product ORDER BY name"))
            connection.commit()

            connection.autoCommit = false
            assertEquals(0, queryInt(connection, "SELECT count(*) FROM product"))
            connection.rollback()
        }
    }

    @Test
    fun `concurrent reservations lock stock and cannot oversell`() {
        val ready = CountDownLatch(2)
        val reservations =
            List(2) {
                CompletableFuture.supplyAsync {
                    reserveWithLock(tenantA.id, inventoryUnitId, 7, ready)
                }
            }

        val results = reservations.map { it.join() }
        assertEquals(1, results.count { it })

        runtimeConnection().use { connection ->
            connection.autoCommit = false
            setTenant(connection, tenantA.id)
            assertEquals(
                7,
                queryInt(connection, "SELECT frozen_quantity FROM inventory_unit WHERE id = $inventoryUnitId"),
            )
            connection.rollback()
        }
    }

    @Test
    fun `authorization baseline separates tenant memberships and global platform grants`() {
        ownerConnection().use { connection ->
            assertEquals(
                1,
                queryInt(
                    connection,
                    "SELECT count(*) FROM platform_user_role assignment " +
                        "JOIN platform_role role ON role.id = assignment.platform_role_id " +
                        "WHERE role.name = 'platform-admin'",
                ),
            )
            assertEquals(1, queryInt(connection, "SELECT count(*) FROM tenant_membership"))
            assertEquals(
                0,
                queryInt(
                    connection,
                    "SELECT count(*) FROM role_permission link " +
                        "JOIN permission permission ON permission.id = link.permission_id " +
                        "WHERE permission.scope = 'PLATFORM'",
                ),
            )
            assertEquals(
                0,
                queryInt(
                    connection,
                    "SELECT count(*) FROM platform_role_permission link " +
                        "JOIN permission permission ON permission.id = link.permission_id " +
                        "WHERE permission.scope <> 'PLATFORM'",
                ),
            )
            assertEquals(
                3,
                queryInt(connection, "SELECT count(DISTINCT scope) FROM permission"),
            )
            assertEquals(
                1,
                queryInt(
                    connection,
                    "SELECT count(*) FROM pg_enum enum_value " +
                        "JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid " +
                        "WHERE enum_type.typname = 'tenant_status' " +
                        "AND enum_value.enumlabel = 'PENDING_ACTIVATION'",
                ),
            )
        }
    }

    private fun seedTenant(
        connection: Connection,
        name: String,
        productName: String,
    ): SeedTenant {
        val tenantId =
            connection.prepareStatement(
                "INSERT INTO tenant (name) VALUES (?) RETURNING id",
            ).use { statement ->
                statement.setString(1, name)
                statement.executeQuery().use { result ->
                    result.next()
                    result.getLong(1)
                }
            }
        val categoryId =
            connection.prepareStatement(
                "INSERT INTO product_category (name, tenant_id) VALUES (?, ?) RETURNING id",
            ).use { statement ->
                statement.setString(1, "$name-category")
                statement.setLong(2, tenantId)
                statement.executeQuery().use { result ->
                    result.next()
                    result.getLong(1)
                }
            }
        val productId =
            connection.prepareStatement(
                """
                INSERT INTO product (name, barcode, unit, enabled, category_id, tenant_id)
                VALUES (?, ?, 'PIECE', TRUE, ?, ?)
                RETURNING id
                """.trimIndent(),
            ).use { statement ->
                statement.setString(1, productName)
                statement.setString(2, "$name-barcode")
                statement.setLong(3, categoryId)
                statement.setLong(4, tenantId)
                statement.executeQuery().use { result ->
                    result.next()
                    result.getLong(1)
                }
            }
        return SeedTenant(tenantId, categoryId, productId)
    }

    private fun seedInventoryUnit(
        connection: Connection,
        tenant: SeedTenant,
        quantity: Int,
    ): Long {
        val inventoryId =
            connection.prepareStatement(
                """
                INSERT INTO inventory (max_stock, product_id, safety_stock, tenant_id)
                VALUES (?, ?, 0, ?)
                RETURNING id
                """.trimIndent(),
            ).use { statement ->
                statement.setInt(1, quantity)
                statement.setLong(2, tenant.productId)
                statement.setLong(3, tenant.id)
                statement.executeQuery().use { result ->
                    result.next()
                    result.getLong(1)
                }
            }
        return connection.prepareStatement(
            """
            INSERT INTO inventory_unit (
                unit_type, purchase_order_id, initial_quantity, quantity,
                frozen_quantity, status, unit_price, version, inventory_id, tenant_id
            ) VALUES ('BATCH', 1, ?, ?, 0, 'NORMAL', 1, 0, ?, ?)
            RETURNING id
            """.trimIndent(),
        ).use { statement ->
            statement.setInt(1, quantity)
            statement.setInt(2, quantity)
            statement.setLong(3, inventoryId)
            statement.setLong(4, tenant.id)
            statement.executeQuery().use { result ->
                result.next()
                result.getLong(1)
            }
        }
    }

    private fun reserveWithLock(
        tenantId: Long,
        unitId: Long,
        amount: Int,
        ready: CountDownLatch,
    ): Boolean =
        runtimeConnection().use { connection ->
            connection.autoCommit = false
            try {
                setTenant(connection, tenantId)
                ready.countDown()
                ready.await()

                val available =
                    connection.prepareStatement(
                        """
                        SELECT quantity - frozen_quantity
                        FROM inventory_unit
                        WHERE id = ?
                        FOR UPDATE
                        """.trimIndent(),
                    ).use { statement ->
                        statement.setLong(1, unitId)
                        statement.executeQuery().use { result ->
                            result.next()
                            result.getInt(1)
                        }
                    }
                if (available < amount) {
                    connection.rollback()
                    return@use false
                }

                connection.prepareStatement(
                    "UPDATE inventory_unit SET frozen_quantity = frozen_quantity + ?, version = version + 1 WHERE id = ?",
                ).use { statement ->
                    statement.setInt(1, amount)
                    statement.setLong(2, unitId)
                    statement.executeUpdate()
                }
                connection.commit()
                true
            } catch (error: Exception) {
                connection.rollback()
                throw error
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

    private fun queryInt(
        connection: Connection,
        sql: String,
    ): Int =
        connection.createStatement().use { statement ->
            statement.executeQuery(sql).use { result ->
                result.next()
                result.getInt(1)
            }
        }

    private fun queryBoolean(
        connection: Connection,
        sql: String,
    ): Boolean =
        connection.createStatement().use { statement ->
            statement.executeQuery(sql).use { result ->
                result.next()
                result.getBoolean(1)
            }
        }

    private fun queryStrings(
        connection: Connection,
        sql: String,
    ): List<String> =
        connection.createStatement().use { statement ->
            statement.executeQuery(sql).use { result ->
                buildList {
                    while (result.next()) add(result.getString(1))
                }
            }
        }

    private fun ownerConnection(): Connection = DriverManager.getConnection(postgres.jdbcUrl, postgres.username, postgres.password)

    private fun runtimeConnection(): Connection = DriverManager.getConnection(postgres.jdbcUrl, "abacusflow_test_app", "runtime-password")

    private data class SeedTenant(val id: Long, val categoryId: Long, val productId: Long)
}
