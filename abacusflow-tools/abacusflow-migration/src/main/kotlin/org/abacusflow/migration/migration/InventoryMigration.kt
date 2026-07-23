package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 依次迁 inventory、inventory_unit 并补 tenant_id。
 * 数量与金额统一使用 Long/BigDecimal；禁止 Double。写入后校验总 quantity、frozen quantity 和金额。
 * 依赖 Product 和 Depot，因为 inventory 引用 product_id，inventory_unit 引用 depot_id。
 */
class InventoryMigration :
    PlannedMigrationTask(
        MigrationTaskId.INVENTORY,
        setOf(MigrationTaskId.PRODUCT, MigrationTaskId.DEPOT),
    )
