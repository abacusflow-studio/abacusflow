package org.abacusflow.inventory

class InventoryIncreasedEvent(
    val inventoryId: Long,
    val productId: Long,
    val depotId: Long,
    val amount: Int,
    val tenantId: Long,
)

class InventoryDecreasedEvent(
    val inventoryId: Long,
    val productId: Long,
    val depotId: Long,
    val amount: Int,
    val tenantId: Long,
)

class InventoryReservedEvent(
    val inventoryId: Long,
    val productId: Long,
    val depotId: Long,
    val amount: Int,
    val tenantId: Long,
)

class LowStockWarningEvent(
    val inventoryId: Long,
    val productId: Long,
    val currentQuantity: Int,
    val safetyStock: Int,
    val tenantId: Long,
)
