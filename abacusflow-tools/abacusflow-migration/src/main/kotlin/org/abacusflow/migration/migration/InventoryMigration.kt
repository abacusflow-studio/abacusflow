package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 依次迁 depot、inventory、inventory_unit 并补 tenant_id。
 * 数量与金额统一使用 Long/BigDecimal；禁止 Double。写入后校验总 quantity、frozen quantity 和金额。
 */
class InventoryMigration :
    PlannedMigrationTask(
        MigrationTaskId.INVENTORY,
        setOf(MigrationTaskId.PRODUCT, MigrationTaskId.PURCHASE_ORDER),
    )
