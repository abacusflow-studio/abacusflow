package org.abacusflow.migration.check

import org.abacusflow.migration.framework.MigrationSelection
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.migration.StandardMigrationPlan
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MigrationSchemaContractTest {
    @Test
    fun `standard business plan excludes identity tasks and their source tables`() {
        val requiredTasks = resolvedTasks(MigrationSelection.All)
        val requirements = MigrationSchemaContract.forTasks(requiredTasks)

        assertTrue(requiredTasks.intersect(IDENTITY_TASKS).isEmpty())
        assertFalse("user_account" in requirements.sourceTables)
        assertFalse("user_external_identity" in requirements.sourceTables)
        assertFalse("role" in requirements.sourceTables)
        assertFalse("permission" in requirements.sourceTables)
        assertFalse("role_permission" in requirements.sourceTables)
        assertFalse("user_role" in requirements.sourceTables)
    }

    private fun resolvedTasks(selection: MigrationSelection): Set<MigrationTaskId> =
        StandardMigrationPlan.create().resolve(selection).mapTo(linkedSetOf()) { it.id }

    private companion object {
        val IDENTITY_TASKS =
            setOf(
                MigrationTaskId.USER,
                MigrationTaskId.MEMBERSHIP,
                MigrationTaskId.ROLE,
                MigrationTaskId.PERMISSION,
                MigrationTaskId.ROLE_PERMISSION,
            )
    }
}
