package org.abacusflow.migration.validation

/** Validator 注册清单；实现 Runner 时应验证它与 MigrationPlan 的任务 ID 一一对应。 */
object StandardValidationPlan {
    fun create(): List<MigrationValidator> =
        listOf(
            TenantValidator(),
            UserValidator(),
            MembershipValidator(),
            RoleValidator(),
            PermissionValidator(),
            RolePermissionValidator(),
            ProductValidator(),
            PurchaseOrderValidator(),
            InventoryValidator(),
            SaleOrderValidator(),
            FinalizeValidator(),
        )
}
