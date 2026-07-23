package org.abacusflow.migration

import org.abacusflow.migration.framework.MigrationSelection
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.migration.StandardMigrationPlan
import org.abacusflow.migration.validation.StandardValidationPlan
import picocli.CommandLine
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

/** 只保护战略契约；详细迁移测试由各任务实现者补齐。 */
class SkeletonArchitectureTest {
    @Test
    fun `every standard task has one validator`() {
        val taskIds = StandardMigrationPlan.create().tasks.map { it.id }
        val validatorIds = StandardValidationPlan.create().map { it.taskId }

        assertEquals(taskIds, validatorIds)
    }

    @Test
    fun `transaction CLI group selects both sides of inventory`() {
        val selection = assertIs<MigrationSelection.Selected>(MigrationSelection.fromCli(listOf("transaction")))

        assertEquals(
            setOf(MigrationTaskId.PURCHASE_ORDER, MigrationTaskId.SALE_ORDER),
            selection.taskIds,
        )
    }

    @Test
    fun `subcommand help never initializes the migration application`() {
        assertEquals(0, CommandLine(MigrateCommand()).execute("--help"))
        assertEquals(0, CommandLine(ValidateCommand()).execute("--help"))
    }
}
