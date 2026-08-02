package org.abacusflow.migration.control

import org.jooq.SQLDialect
import org.jooq.impl.DSL
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ControlSchemaInitializerTest {
    @Test
    fun `ddl is parsed and rendered with configured schema`() {
        val queries = ControlSchemaDdl("custom_migration_control").queries(DSL.using(SQLDialect.POSTGRES))
        val sql = queries.joinToString("\n") { it.sql }

        assertTrue(queries.size >= 10, "The complete control schema should be parsed")
        assertTrue(sql.contains("custom_migration_control"))
        assertTrue(sql.contains("migration_run"))
        assertTrue(sql.contains("create schema if not exists", ignoreCase = true))
        assertFalse(sql.contains("abacusflow_migration"))
    }

    @Test
    fun `all create statements remain idempotent`() {
        val queries = ControlSchemaDdl("abacusflow_migration").queries(DSL.using(SQLDialect.POSTGRES))
        val createStatements = queries.map { it.sql }.filter { it.trimStart().startsWith("create", ignoreCase = true) }

        assertTrue(createStatements.isNotEmpty())
        assertTrue(createStatements.all { it.contains("if not exists", ignoreCase = true) })
    }
}
