package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移采购单，补 tenant_id。
 * purchase_order 在 supplier 之后、purchase_order_item 之前迁移。
 */
class PurchaseOrderMigration :
    PlannedMigrationTask(
        MigrationTaskId.PURCHASE_ORDER,
        setOf(MigrationTaskId.SUPPLIER),
    )
