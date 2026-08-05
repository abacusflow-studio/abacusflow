package org.abacusflow.migration.check

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 一组已解析迁移任务实际会读写的源表和目标表。
 *
 * 这里描述的是物理数据库契约，不是任务依赖图。依赖由 MigrationPlan 解析；
 * 本契约只负责把解析后的任务集合转换成 schema 预检范围。
 */
data class MigrationSchemaRequirements(
    val sourceTables: Set<String>,
    val targetTables: Set<String>,
)

/**
 * Legacy V1 单租户模型到 V2 多租户模型的表级契约。
 *
 * 源库授权关系仍然是 `role / role_permission / user_role`；
 * `tenant_role / tenant_role_permission / tenant_membership_role` 只属于 V2 目标库。
 * 不能把两组表名当作简单别名，因为 `user_id -> membership_id` 包含关系模型转换。
 */
object MigrationSchemaContract {
    private val requirementsByTask: Map<MigrationTaskId, MigrationSchemaRequirements> =
        mapOf(
            MigrationTaskId.TENANT to requirements(target = setOf("tenant", "tenant_placement")),
            MigrationTaskId.USER to
                requirements(
                    source = setOf("user_account", "user_external_identity"),
                    target = setOf("user_account", "user_external_identity"),
                ),
            MigrationTaskId.MEMBERSHIP to
                requirements(
                    source = setOf("user_account"),
                    target = setOf("tenant_membership"),
                ),
            MigrationTaskId.ROLE to
                requirements(
                    source = setOf("role"),
                    target = setOf("tenant_role"),
                ),
            MigrationTaskId.PERMISSION to
                requirements(
                    source = setOf("permission"),
                    target = setOf("permission"),
                ),
            MigrationTaskId.ROLE_PERMISSION to
                requirements(
                    source = setOf("role", "role_permission", "user_account", "user_role"),
                    target = setOf("tenant_role_permission", "tenant_membership", "tenant_membership_role"),
                ),
            MigrationTaskId.PRODUCT to
                requirements(
                    source = setOf("product_category", "product"),
                    target = setOf("product_category", "product"),
                ),
            MigrationTaskId.DEPOT to sameTable("depot"),
            MigrationTaskId.SUPPLIER to sameTable("supplier"),
            MigrationTaskId.PURCHASE_ORDER to sameTable("purchase_order"),
            MigrationTaskId.PURCHASE_ORDER_ITEM to sameTable("purchase_order_item"),
            MigrationTaskId.INVENTORY to
                requirements(
                    source = setOf("inventory", "inventory_unit"),
                    target = setOf("inventory", "inventory_unit"),
                ),
            MigrationTaskId.CUSTOMER to sameTable("customer"),
            MigrationTaskId.SALE_ORDER to sameTable("sale_order"),
            MigrationTaskId.SALE_ORDER_ITEM to sameTable("sale_order_item"),
            MigrationTaskId.FINALIZE to requirements(),
        )

    init {
        check(requirementsByTask.keys == MigrationTaskId.entries.toSet()) {
            "Every migration task must declare its schema requirements"
        }
    }

    /** 合并已解析任务（已包含依赖闭包）的所有表级需求。 */
    fun forTasks(taskIds: Set<MigrationTaskId>): MigrationSchemaRequirements =
        MigrationSchemaRequirements(
            sourceTables =
                taskIds
                    .flatMapTo(linkedSetOf()) { requirementsByTask.getValue(it).sourceTables },
            targetTables =
                taskIds
                    .flatMapTo(linkedSetOf()) { requirementsByTask.getValue(it).targetTables },
        )

    private fun sameTable(table: String) = requirements(source = setOf(table), target = setOf(table))

    private fun requirements(
        source: Set<String> = emptySet(),
        target: Set<String> = emptySet(),
    ) = MigrationSchemaRequirements(source, target)
}
