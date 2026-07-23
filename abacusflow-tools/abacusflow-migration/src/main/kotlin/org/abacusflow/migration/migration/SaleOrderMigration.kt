package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移销售单，补 tenant_id。
 * sale_order 在 customer 和 inventory 之后迁移，因为引用 customer_id 且销售明细依赖库存单元。
 */
class SaleOrderMigration :
    PlannedMigrationTask(
        MigrationTaskId.SALE_ORDER,
        setOf(MigrationTaskId.CUSTOMER, MigrationTaskId.INVENTORY),
    )
