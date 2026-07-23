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
    fun `standard plan follows fixed topological order`() {
        val taskIds = StandardMigrationPlan.create().tasks.map { it.id }

        assertEquals(MigrationTaskId.entries, taskIds)
    }

    @Test
    fun `transaction CLI group selects all transaction tasks`() {
        val selection = assertIs<MigrationSelection.Selected>(MigrationSelection.fromCli(listOf("transaction")))

        assertEquals(
            setOf(
                MigrationTaskId.SUPPLIER,
                MigrationTaskId.PURCHASE_ORDER,
                MigrationTaskId.PURCHASE_ORDER_ITEM,
                MigrationTaskId.CUSTOMER,
                MigrationTaskId.SALE_ORDER,
                MigrationTaskId.SALE_ORDER_ITEM,
            ),
            selection.taskIds,
        )
    }

    @Test
    fun `authorization CLI group selects authorization tasks`() {
        val selection = assertIs<MigrationSelection.Selected>(MigrationSelection.fromCli(listOf("authorization")))

        assertEquals(
            setOf(
                MigrationTaskId.ROLE,
                MigrationTaskId.PERMISSION,
                MigrationTaskId.ROLE_PERMISSION,
            ),
            selection.taskIds,
        )
    }

    @Test
    fun `dependency closure includes predecessors for partial selection`() {
        val selection = assertIs<MigrationSelection.Selected>(MigrationSelection.fromCli(listOf("sale-order")))

        // sale-order 依赖 customer + inventory；inventory 依赖 product + depot
        assertEquals(
            setOf(
                MigrationTaskId.SALE_ORDER,
                MigrationTaskId.CUSTOMER,
                MigrationTaskId.INVENTORY,
                MigrationTaskId.PRODUCT,
                MigrationTaskId.DEPOT,
                MigrationTaskId.TENANT,
            ),
            selection.taskIds.let { MigrationSelection.resolveClosure(it) },
        )
    }

    @Test
    fun `subcommand help never initializes the migration application`() {
        assertEquals(0, CommandLine(MigrateCommand()).execute("--help"))
        assertEquals(0, CommandLine(ValidateCommand()).execute("--help"))
    }
}
