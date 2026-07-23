package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 在库存单元存在后迁移 customer、sale_order、sale_order_item。
 * 对数组型 sale_order_ids 与销售明细之间的双写关系，必须确定唯一事实来源并做交叉校验。
 */
class SaleOrderMigration :
    PlannedMigrationTask(
        MigrationTaskId.SALE_ORDER,
        setOf(MigrationTaskId.TENANT, MigrationTaskId.INVENTORY),
    )
