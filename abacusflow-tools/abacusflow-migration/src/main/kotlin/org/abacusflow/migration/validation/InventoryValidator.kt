package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 校验 inventory/inventory_unit 数量、库存总数量、冻结量与精确金额，并检查 product/depot/order 引用。
 */
class InventoryValidator : PlannedMigrationValidator(MigrationTaskId.INVENTORY)
