package org.abacusflow.migration.migration

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class TableMigrationSupportTest {
    @Test
    fun `array type keeps PostgreSQL brackets outside identifier quoting`() {
        assertEquals("bigint[]", renderPostgresTypeName("bigint[]"))
        assertEquals("inventory_status", renderPostgresTypeName("inventory_status"))
    }

    @Test
    fun `type name rejects SQL fragments`() {
        assertFailsWith<IllegalArgumentException> {
            renderPostgresTypeName("bigint); DROP TABLE tenant; --")
        }
    }
}
