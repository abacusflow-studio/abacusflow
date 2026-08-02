package org.abacusflow.migration.config

import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class YamlConfigLoaderTest {
    private val loader = YamlConfigLoader()

    @Test
    fun `example configuration defines the supported kebab case contract`() {
        val example =
            requireNotNull(javaClass.classLoader.getResourceAsStream("migration.example.yml")) {
                "migration.example.yml must be packaged as documentation"
            }.bufferedReader(StandardCharsets.UTF_8).use { reader ->
                reader.readText()
            }.replace(Regex("""[$][{][^}]+}"""), "test-password")

        withTemporaryConfig(example) { path ->
            val config = loader.load(path)

            assertEquals(30, config.source.connectionTimeoutSeconds)
            assertEquals(1_000, config.migration.batchSize)
            assertEquals(1_000, config.migration.fetchSize)
            assertEquals("abacusflow_migration", config.migration.controlSchema)
            assertEquals("默认租户", config.migration.defaultTenant.displayName)
        }
    }

    @Test
    fun `snake case keys are rejected instead of silently accepted`() {
        val invalidYaml = validYaml().replace("batch-size", "batch_size")

        withTemporaryConfig(invalidYaml) { path ->
            assertFailsWith<UnrecognizedPropertyException> {
                loader.load(path)
            }
        }
    }

    @Test
    fun `missing configuration reports its absolute path`() {
        val missing = Path.of("missing-migration-config.yml")

        val error =
            assertFailsWith<IllegalArgumentException> {
                loader.load(missing)
            }

        assertTrue(error.message.orEmpty().contains(missing.toAbsolutePath().normalize().toString()))
    }

    @Test
    fun `control schema accepts conventional identifiers and rejects unsafe names`() {
        val invalidYaml = validYaml().replace("control-schema: abacusflow_migration", "control-schema: invalid-schema")

        withTemporaryConfig(invalidYaml) { path ->
            val error = assertFailsWith<IllegalArgumentException> { loader.load(path) }

            assertTrue(error.message.orEmpty().contains("migration.control-schema"))
        }
    }

    @Test
    fun `database configuration string representation masks password`() {
        val config =
            DatabaseConfig(
                url = "jdbc:postgresql://localhost/source",
                username = "migration",
                password = "do-not-log-this",
            )

        assertFalse(config.toString().contains("do-not-log-this"))
        assertTrue(config.toString().contains("password=***"))
    }

    private fun validYaml(): String =
        """
        source:
          url: jdbc:postgresql://localhost/source
          username: source
          password: source-password
          connection-timeout-seconds: 30
        target:
          url: jdbc:postgresql://localhost/target
          username: target
          password: target-password
          connection-timeout-seconds: 30
        migration:
          batch-size: 1000
          fetch-size: 1000
          control-schema: abacusflow_migration
          fail-fast: true
          default-tenant:
            id: 1
            name: default
            display-name: 默认租户
        """.trimIndent()

    private fun withTemporaryConfig(
        yaml: String,
        block: (Path) -> Unit,
    ) {
        val path = Files.createTempFile("abacusflow-migration-", ".yml")
        try {
            Files.writeString(path, yaml, StandardCharsets.UTF_8)
            block(path)
        } finally {
            Files.deleteIfExists(path)
        }
    }
}
