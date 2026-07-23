package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移采购明细，补 tenant_id。
 * purchase_order_item 在 purchase_order 之后迁移，因为引用 order_id。
 */
class PurchaseOrderItemMigration :
    PlannedMigrationTask(
        MigrationTaskId.PURCHASE_ORDER_ITEM,
        setOf(MigrationTaskId.PURCHASE_ORDER),
    )
