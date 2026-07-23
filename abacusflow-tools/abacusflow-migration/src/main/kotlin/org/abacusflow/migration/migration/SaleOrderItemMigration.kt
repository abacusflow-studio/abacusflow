package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移销售明细，补 tenant_id。
 * sale_order_item 在 sale_order 之后迁移，因为引用 order_id。
 */
class SaleOrderItemMigration :
    PlannedMigrationTask(
        MigrationTaskId.SALE_ORDER_ITEM,
        setOf(MigrationTaskId.SALE_ORDER),
    )
