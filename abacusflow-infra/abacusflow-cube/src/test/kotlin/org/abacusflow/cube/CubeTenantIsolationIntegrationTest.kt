package org.abacusflow.cube

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.testcontainers.Testcontainers
import org.testcontainers.containers.GenericContainer
import org.testcontainers.containers.Network
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.containers.wait.strategy.Wait
import org.testcontainers.utility.DockerImageName
import org.testcontainers.utility.MountableFile
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.nio.file.Path
import java.sql.Connection
import java.sql.DriverManager
import java.time.Duration
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CubeTenantIsolationIntegrationTest {
    private val network = Network.newNetwork()
    private val postgres =
        PostgreSQLContainer<Nothing>("postgres:15-alpine").apply {
            withDatabaseName("abacusflow_cube_test")
            withUsername("migration_owner")
            withPassword("migration-password")
            withNetwork(network)
            withNetworkAliases("postgres")
        }
    private val objectMapper = jacksonObjectMapper()
    private val httpClient = HttpClient.newHttpClient()
    private lateinit var cube: GenericContainer<Nothing>
    private lateinit var tenantA: SeedTenant
    private lateinit var tenantB: SeedTenant

    @BeforeAll
    fun startServices() {
        postgres.start()
        Testcontainers.exposeHostPorts(postgres.getMappedPort(5432))
        Flyway.configure()
            .dataSource(postgres.jdbcUrl, postgres.username, postgres.password)
            .locations("classpath:db/migration")
            .load()
            .migrate()

        ownerConnection().use { connection ->
            connection.createStatement().use { statement ->
                statement.execute(
                    """
                    CREATE ROLE abacusflow_cube_test LOGIN PASSWORD 'cube-read-password'
                        NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS;
                    GRANT abacusflow_cube_reader TO abacusflow_cube_test;
                    """.trimIndent(),
                )
            }
            tenantA = seedTenant(connection, "cube-tenant-a", "Cube Tenant A")
            tenantB = seedTenant(connection, "cube-tenant-b", "Cube Tenant B")
            seedCrossTenantReference(connection, tenantA.id, tenantB.categoryId)
        }

        val configDirectory = Path.of(System.getProperty("cube.config.dir"))
        cube =
            GenericContainer<Nothing>(DockerImageName.parse("cubejs/cube:v1.3")).apply {
                withNetwork(network)
                withExposedPorts(4000)
                withEnv("CUBEJS_API_SECRET", CUBE_API_SECRET)
                withEnv("CUBEJS_AUTH_MODE", "shared-secret")
                withEnv("CUBEJS_DEV_MODE", "false")
                withEnv("CUBEJS_DB_TYPE", "postgres")
                withEnv("CUBEJS_DB_HOST", "host.testcontainers.internal")
                withEnv("CUBEJS_DB_PORT", postgres.getMappedPort(5432).toString())
                withEnv("CUBEJS_DB_NAME", postgres.databaseName)
                withEnv("CUBEJS_DB_USER", "abacusflow_cube_test")
                withEnv("CUBEJS_DB_PASS", "cube-read-password")
                withEnv("CUBEJS_DB_MAX_POOL", "1")
                withEnv("CUBEJS_CONCURRENCY", "1")
                withEnv("CUBEJS_CACHE_AND_QUEUE_DRIVER", "memory")
                withEnv("CUBEJS_SCHEDULED_REFRESH_TIMER", "false")
                withEnv("CUBEJS_TELEMETRY", "false")
                withCopyFileToContainer(
                    MountableFile.forHostPath(configDirectory.resolve("cube.js")),
                    "/cube/conf/cube.js",
                )
                withCopyFileToContainer(
                    MountableFile.forHostPath(configDirectory.resolve("model")),
                    "/cube/conf/model",
                )
                waitingFor(
                    Wait.forHttp("/readyz")
                        .forStatusCode(200)
                        .withStartupTimeout(Duration.ofMinutes(3)),
                )
            }
        cube.start()
    }

    @AfterAll
    fun stopServices() {
        if (::cube.isInitialized) cube.stop()
        postgres.stop()
        network.close()
    }

    @Test
    fun `dedicated Cube identity is read only non superuser and subject to RLS`() {
        ownerConnection().use { connection ->
            assertFalse(queryBoolean(connection, "SELECT rolsuper FROM pg_roles WHERE rolname = 'abacusflow_cube_test'"))
            assertFalse(queryBoolean(connection, "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'abacusflow_cube_test'"))
            assertTrue(queryBoolean(connection, "SELECT has_table_privilege('abacusflow_cube_test', 'product', 'SELECT')"))
            assertFalse(queryBoolean(connection, "SELECT has_table_privilege('abacusflow_cube_test', 'product', 'INSERT')"))
        }

        cubeConnection().use { connection ->
            assertEquals(0, queryInt(connection, "SELECT count(*) FROM product"))
            connection.prepareStatement("SELECT set_config('app.tenant_id', ?, false)").use { statement ->
                statement.setString(1, tenantA.id.toString())
                statement.execute()
            }
            assertEquals(2, queryInt(connection, "SELECT count(*) FROM product"))
        }
    }

    @Test
    fun `joined analytics query returns only the signed token tenant`() {
        val tenantARows = loadProductCategories(signToken(tenantA.id, CUBE_API_SECRET))
        val tenantBRows = loadProductCategories(signToken(tenantB.id, CUBE_API_SECRET))

        val tenantACategories = rowsByCategory(tenantARows)
        val tenantBCategories = rowsByCategory(tenantBRows)

        assertEquals(1, tenantACategories[tenantA.categoryName], diagnostics(tenantARows))
        assertFalse(tenantACategories.containsKey(tenantB.categoryName), diagnostics(tenantARows))
        assertEquals(1, tenantBCategories[tenantB.categoryName], diagnostics(tenantBRows))
        assertFalse(tenantBCategories.containsKey(tenantA.categoryName), diagnostics(tenantBRows))
    }

    @Test
    fun `forged tenant token is rejected before data is returned`() {
        val response = load(signToken(tenantB.id, "wrong-signing-secret-that-is-long-enough"))

        assertTrue(response.statusCode() == 401 || response.statusCode() == 403, response.body())
        assertFalse(response.body().contains(tenantB.categoryName))
    }

    private fun loadProductCategories(token: String): JsonNode {
        val response = load(token)
        assertEquals(200, response.statusCode(), response.body())
        return objectMapper.readTree(response.body()).path("data")
    }

    private fun load(token: String): HttpResponse<String> {
        val body =
            objectMapper.writeValueAsString(
                mapOf(
                    "query" to
                        mapOf(
                            "measures" to listOf("product.count"),
                            "dimensions" to listOf("product_category.name"),
                            "order" to mapOf("product_category.name" to "asc"),
                        ),
                ),
            )
        val request =
            HttpRequest.newBuilder()
                .uri(URI.create("http://${cube.host}:${cube.getMappedPort(4000)}/cubejs-api/v1/load"))
                .header("Authorization", "Bearer $token")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build()
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString())
    }

    private fun rowsByCategory(rows: JsonNode): Map<String, Int> =
        rows.associate { row ->
            row.path("product_category.name").asText() to row.path("product.count").asText().toInt()
        }

    private fun diagnostics(rows: JsonNode): String = "rows=${rows.toPrettyString()}\nlogs=${cube.logs.takeLast(8_000)}"

    private fun seedTenant(
        connection: Connection,
        tenantName: String,
        categoryName: String,
    ): SeedTenant {
        val tenantId =
            connection.prepareStatement("INSERT INTO tenant (name) VALUES (?) RETURNING id").use { statement ->
                statement.setString(1, tenantName)
                statement.executeQuery().use { result ->
                    result.next()
                    result.getLong(1)
                }
            }
        val categoryId =
            connection.prepareStatement(
                "INSERT INTO product_category (name, tenant_id) VALUES (?, ?) RETURNING id",
            ).use { statement ->
                statement.setString(1, categoryName)
                statement.setLong(2, tenantId)
                statement.executeQuery().use { result ->
                    result.next()
                    result.getLong(1)
                }
            }
        connection.prepareStatement(
            """
            INSERT INTO product (name, barcode, unit, enabled, category_id, tenant_id)
            VALUES (?, ?, 'PIECE', TRUE, ?, ?)
            """.trimIndent(),
        ).use { statement ->
            statement.setString(1, "$tenantName-product")
            statement.setString(2, "$tenantName-barcode")
            statement.setLong(3, categoryId)
            statement.setLong(4, tenantId)
            statement.executeUpdate()
        }
        return SeedTenant(tenantId, categoryId, categoryName)
    }

    private fun seedCrossTenantReference(
        connection: Connection,
        tenantId: Long,
        foreignCategoryId: Long,
    ) {
        connection.prepareStatement(
            """
            INSERT INTO product (name, barcode, unit, enabled, category_id, tenant_id)
            VALUES ('cross-tenant-reference', 'cross-tenant-reference', 'PIECE', TRUE, ?, ?)
            """.trimIndent(),
        ).use { statement ->
            statement.setLong(1, foreignCategoryId)
            statement.setLong(2, tenantId)
            statement.executeUpdate()
        }
    }

    private fun signToken(
        tenantId: Long,
        secret: String,
    ): String {
        val now = System.currentTimeMillis() / 1000
        val encoder = Base64.getUrlEncoder().withoutPadding()
        val header = encoder.encodeToString("""{"alg":"HS256","typ":"JWT"}""".toByteArray(StandardCharsets.UTF_8))
        val payload =
            encoder.encodeToString(
                """{"sub":"cube-integration-test","tenantId":$tenantId,"iat":$now,"exp":${now + 300}}"""
                    .toByteArray(StandardCharsets.UTF_8),
            )
        val hmac = Mac.getInstance("HmacSHA256")
        hmac.init(SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256"))
        val signature =
            encoder.encodeToString(hmac.doFinal("$header.$payload".toByteArray(StandardCharsets.UTF_8)))
        return "$header.$payload.$signature"
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

    private fun ownerConnection(): Connection = DriverManager.getConnection(postgres.jdbcUrl, postgres.username, postgres.password)

    private fun cubeConnection(): Connection = DriverManager.getConnection(postgres.jdbcUrl, "abacusflow_cube_test", "cube-read-password")

    private data class SeedTenant(
        val id: Long,
        val categoryId: Long,
        val categoryName: String,
    )

    companion object {
        private const val CUBE_API_SECRET = "cube-integration-test-secret-with-at-least-32-characters"
    }
}
