package org.abacusflow.migration.check

import org.abacusflow.migration.framework.MigrationSelection
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.migration.StandardMigrationPlan
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MigrationSchemaContractTest {
    @Test
    fun `user migration does not require unrelated legacy authorization tables`() {
        val requiredTasks = resolvedTasks(MigrationSelection.Selected(setOf(MigrationTaskId.USER)))
        val requirements = MigrationSchemaContract.forTasks(requiredTasks)

        assertTrue("user_account" in requirements.sourceTables)
        assertTrue("user_external_identity" in requirements.sourceTables)
        assertFalse("role" in requirements.sourceTables)
        assertFalse("role_permission" in requirements.sourceTables)
        assertFalse("user_role" in requirements.sourceTables)
    }

    @Test
    fun `authorization migration keeps legacy source and tenant aware target contracts separate`() {
        val requiredTasks =
            resolvedTasks(
                MigrationSelection.Selected(
                    setOf(MigrationTaskId.ROLE, MigrationTaskId.PERMISSION, MigrationTaskId.ROLE_PERMISSION),
                ),
            )
        val requirements = MigrationSchemaContract.forTasks(requiredTasks)

        assertTrue(requirements.sourceTables.containsAll(setOf("role", "permission", "role_permission", "user_role")))
        assertFalse("tenant_role" in requirements.sourceTables)
        assertTrue(
            requirements.targetTables.containsAll(
                setOf("tenant_role", "tenant_role_permission", "tenant_membership_role"),
            ),
        )
        assertFalse("role" in requirements.targetTables)
    }

    private fun resolvedTasks(selection: MigrationSelection): Set<MigrationTaskId> =
        StandardMigrationPlan.create().resolve(selection).mapTo(linkedSetOf()) { it.id }
}
