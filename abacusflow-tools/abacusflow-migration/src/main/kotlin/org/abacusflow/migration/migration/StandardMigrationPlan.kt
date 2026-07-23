package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationPlan

/** 标准全量计划的唯一注册位置；列表顺序应与依赖图的拓扑顺序一致。 */
object StandardMigrationPlan {
    fun create(): MigrationPlan =
        MigrationPlan(
            listOf(
                TenantMigration(),
                UserMigration(),
                MembershipMigration(),
                RoleMigration(),
                PermissionMigration(),
                RolePermissionMigration(),
                ProductMigration(),
                PurchaseOrderMigration(),
                InventoryMigration(),
                SaleOrderMigration(),
                FinalizeMigration(),
            ),
        )
}
