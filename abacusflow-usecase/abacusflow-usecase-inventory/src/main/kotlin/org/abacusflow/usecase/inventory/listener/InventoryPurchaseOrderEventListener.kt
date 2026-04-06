package org.abacusflow.usecase.inventory.listener

import org.abacusflow.db.inventory.InventoryRepository
import org.abacusflow.db.inventory.InventoryUnitRepository
import org.abacusflow.inventory.InventoryUnit
import org.abacusflow.transaction.PurchaseOrderCompletedEvent
import org.abacusflow.transaction.PurchaseOrderItem
import org.abacusflow.transaction.PurchaseOrderReversedEvent
import org.abacusflow.transaction.TransactionProductType.ASSET
import org.abacusflow.transaction.TransactionProductType.MATERIAL
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
@Transactional
class InventoryPurchaseOrderEventListener(
    private val inventoryRepository: InventoryRepository,
    private val inventoryUnitRepository: InventoryUnitRepository,
) {
    @EventListener
    fun handlePurchaseOrderCompletedEvent(event: PurchaseOrderCompletedEvent) {
        val order = event.order
        println("PurchaseOrder Completed orderNo: ${order.no}")

        // 按照一个产品类型进行分组
        val units =
            order.items.groupBy { it.productType }.flatMap { (productType, items) ->
                when (productType) {
                    MATERIAL -> buildMaterialUnits(items, order.id)
                    ASSET -> buildAssetUnits(items, order.id)
                }
            }

        if (units.size > 0) {
            inventoryUnitRepository.saveAll(units)
        }
    }

    private fun buildMaterialUnits(
        items: List<PurchaseOrderItem>,
        orderId: Long,
    ): List<InventoryUnit.BatchInventoryUnit> {
        return items.groupBy { it.productId }.map { (productId, batchItems) ->
            val inventory =
                inventoryRepository.findByProductId(productId)
                    ?: throw NoSuchElementException("Product with id $productId not found")

            // 验证同一产品的单价一致
            check(batchItems.map { it.unitPrice }.distinct().size == 1) {
                "Product $productId has inconsistent unit prices"
            }

            // 验证同一产品的批次代码一致
            check(batchItems.map { it.batchCode }.distinct().size == 1) {
                "Product $productId has inconsistent batch codes"
            }

            val simpleItem = batchItems.first()
            val totalQuantity = batchItems.sumOf { it.quantity.toLong() }

            val batchCode =
                checkNotNull(batchItems.first().batchCode) {
                    "Product $productId missing batch code"
                }

            InventoryUnit.BatchInventoryUnit(
                inventory = inventory,
                purchaseOrderId = orderId,
                initialQuantity = totalQuantity,
                unitPrice = simpleItem.unitPrice,
                batchCode = batchCode,
                depotId = null,
            )
        }
    }

    private fun buildAssetUnits(
        items: List<PurchaseOrderItem>,
        orderId: Long,
    ): List<InventoryUnit.InstanceInventoryUnit> {
        return items.groupBy { it.productId }.flatMap { (productId, items) ->
            val inventory =
                inventoryRepository.findByProductId(productId)
                    ?: throw NoSuchElementException("Product with id $productId not found")

            items.map { item ->
                check(item.quantity == 1) {
                    "Asset product quantity must be 1, found: ${item.quantity}"
                }

                // 验证序列号存在
                val serialNumber =
                    checkNotNull(item.serialNumber) {
                        "Asset product $productId must have serial number"
                    }

                InventoryUnit.InstanceInventoryUnit(
                    inventory = inventory,
                    purchaseOrderId = orderId,
                    unitPrice = item.unitPrice,
                    serialNumber = serialNumber,
                    depotId = null,
                )
            }
        }
    }

    @EventListener
    fun handlePurchaseOrderReversedEvent(event: PurchaseOrderReversedEvent) {
        val order = event.order
        println("PurchaseOrder Reversed orderNo: ${order.no}")

        // 查询该订单产生的库存单元
        val units = inventoryUnitRepository.findByPurchaseOrderId(order.id)

        if (units.isEmpty()) {
            println("No InventoryUnits found for PurchaseOrder ${order.no}, skipping reversal")
            return
        }

        // 检查库存是否可以撤回
        units.forEach { unit ->
            require(unit.saleOrderIds.isEmpty()) { "库存单元 ${unit.id} 已被销售订单占用，无法撤回" }

            when (unit.status) {
                InventoryUnit.InventoryUnitStatus.NORMAL -> {
                    require(unit.initialQuantity == unit.remainingQuantity) { "库存单元 ${unit.id} 已部分出库，无法撤回" }
                }

                InventoryUnit.InventoryUnitStatus.CONSUMED ->
                    throw RuntimeException("库存单元 ${unit.id} 已完全出库，无法撤回")

                InventoryUnit.InventoryUnitStatus.CANCELED ->
                    throw RuntimeException("库存单元 ${unit.id} 已取消，无法撤回")

                InventoryUnit.InventoryUnitStatus.REVERSED -> {
                    require(unit.initialQuantity == unit.remainingQuantity) { "库存单元 ${unit.id} 已部分出库，无法撤回" }
                }
            }
        }

        inventoryUnitRepository.deleteAll(units)
    }
}
