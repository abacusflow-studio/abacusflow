package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 在库存单元之前迁移 supplier、purchase_order、purchase_order_item。
 * 原计划的单一 Transaction 任务被拆开，否则采购单与库存、销售明细会形成不可表达的顺序依赖。
 */
class PurchaseOrderMigration :
    PlannedMigrationTask(
        MigrationTaskId.PURCHASE_ORDER,
        setOf(MigrationTaskId.TENANT, MigrationTaskId.PRODUCT),
    )
