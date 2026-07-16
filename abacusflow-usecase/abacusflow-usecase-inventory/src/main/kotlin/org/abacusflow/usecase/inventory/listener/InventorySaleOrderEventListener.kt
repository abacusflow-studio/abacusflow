package org.abacusflow.usecase.inventory.listener

import org.abacusflow.db.inventory.InventoryUnitRepository
import org.abacusflow.inventory.InventoryUnit
import org.abacusflow.transaction.SaleOrderCanceledEvent
import org.abacusflow.transaction.SaleOrderCompletedEvent
import org.abacusflow.transaction.SaleOrderCreatedEvent
import org.abacusflow.transaction.SaleOrderReversedEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
@Transactional
class InventorySaleOrderEventListener(
    private val inventoryUnitRepository: InventoryUnitRepository,
) {
    @EventListener
    fun handleSaleOrderCreatedEvent(event: SaleOrderCreatedEvent) {
        val order = event.order
        println("SaleOrder CreatedEvent orderNo: ${order.no}")

        order.items.groupBy { it.inventoryUnitId }.forEach { (inventoryUnitId, inventories) ->
            val totalQuantity = inventories.sumOf { it.quantity }

            val units =
                inventoryUnitRepository.findByIdAndStatusIn(
                    inventoryUnitId,
                    listOf(
                        InventoryUnit.InventoryUnitStatus.NORMAL,
                        InventoryUnit.InventoryUnitStatus.REVERSED,
                    ),
                )

            units.forEach { unit ->
                unit.reserve(totalQuantity)
            }
        }
    }

    @EventListener
    fun handleSaleOrderCanceledEvent(event: SaleOrderCanceledEvent) {
        val order = event.order
        println("SaleOrder CanceledEvent orderNo: ${order.no}")

        order.items.groupBy { it.inventoryUnitId }.forEach { (inventoryUnitId, inventories) ->
            val totalQuantity = inventories.sumOf { it.quantity }

            val units =
                inventoryUnitRepository.findByIdAndStatusIn(
                    inventoryUnitId,
                    listOf(
                        InventoryUnit.InventoryUnitStatus.NORMAL,
                        InventoryUnit.InventoryUnitStatus.REVERSED,
                    ),
                )

            units.forEach { unit ->
                unit.release(totalQuantity)
            }
        }
    }

    @EventListener
    fun handleSaleOrderCompletedEvent(event: SaleOrderCompletedEvent) {
        val order = event.order
        println("SaleOrder Completed orderNo: ${order.no}")

        order.items.groupBy { it.inventoryUnitId }.forEach { (inventoryUnitId, inventories) ->
            val totalQuantity = inventories.sumOf { it.quantity }

            val units =
                inventoryUnitRepository.findByIdAndStatusIn(
                    inventoryUnitId,
                    listOf(
                        InventoryUnit.InventoryUnitStatus.NORMAL,
                        InventoryUnit.InventoryUnitStatus.REVERSED,
                    ),
                )

            units.forEach { unit ->
                unit.release(totalQuantity)
                unit.consume(order.id, totalQuantity)
            }
        }
    }

    @EventListener
    fun handleSaleOrderReversedEvent(event: SaleOrderReversedEvent) {
        val order = event.order
        println("SaleOrder Reversed orderNo: ${order.no}")

        // 查询该订单产生的库存单元
        val units = inventoryUnitRepository.findAllBySaleOrderIdAndTenantId(order.id, order.tenantId)

        if (units.isEmpty()) {
            println("No InventoryUnits found for PurchaseOrder ${order.no}, skipping reversal")
            return
        }

        val sumItemQuantityByUnitId: Map<Long, Int> =
            order.items
                .groupBy { it.inventoryUnitId }
                .mapValues { (_, items) -> items.sumOf { it.quantity } }

        units.forEach { unit ->
            val quantityForReverse = sumItemQuantityByUnitId.getValue(unit.id)

            unit.reverse(quantityForReverse, order.id)
        }

        inventoryUnitRepository.saveAll(units)
    }
}
