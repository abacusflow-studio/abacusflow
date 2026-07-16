package org.abacusflow.usecase.transaction.service.impl

import org.abacusflow.db.partner.SupplierRepository
import org.abacusflow.db.product.ProductRepository
import org.abacusflow.db.transaction.PurchaseOrderRepository
import org.abacusflow.product.Product
import org.abacusflow.transaction.PurchaseOrder
import org.abacusflow.transaction.PurchaseOrderItem
import org.abacusflow.transaction.TransactionProductType
import org.abacusflow.usecase.transaction.CreatePurchaseOrderInputTO
import org.abacusflow.usecase.transaction.PurchaseItemInputTO
import org.abacusflow.usecase.transaction.PurchaseOrderTO
import org.abacusflow.usecase.transaction.mapper.toTO
import org.abacusflow.usecase.transaction.service.PurchaseOrderCommandService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional
class PurchaseOrderCommandServiceImpl(
    private val purchaseOrderRepository: PurchaseOrderRepository,
    private val supplierRepository: SupplierRepository,
    private val productRepository: ProductRepository,
) : PurchaseOrderCommandService {
    override fun createPurchaseOrder(input: CreatePurchaseOrderInputTO): PurchaseOrderTO {
        // Verify supplier belongs to the same tenant
        supplierRepository.findById(input.supplierId)
            .orElseThrow { NoSuchElementException("Supplier not found with id: ${input.supplierId}") }

        val products =
            productRepository.findAllById(
                input.orderItems
                    .map { it.productId }
                    .distinct(),
            )

        // Hibernate Filter 自动保证只查询到当前租户的产品，无需手动校验 tenantId
        val productMapById = products.associateBy { it.id }

        val orderItems =
            input.orderItems.map { item ->
                mapInputOrderItemToOrderItem(item, productMapById)
            }

        val purchaseOrder =
            PurchaseOrder(
                supplierId = input.supplierId,
                orderDate = input.orderDate,
                note = input.note,
                items = orderItems,
            )

        return purchaseOrderRepository.save(purchaseOrder).toTO()
    }

    override fun completeOrder(id: Long): PurchaseOrderTO {
        val purchaseOrder =
            purchaseOrderRepository.findById(id)
                .orElseThrow { NoSuchElementException("PurchaseOrder not found with id: $id") }
        purchaseOrder.completeOrder()
        return purchaseOrderRepository.save(purchaseOrder).toTO()
    }

    override fun cancelOrder(id: Long): PurchaseOrderTO {
        val purchaseOrder =
            purchaseOrderRepository.findById(id)
                .orElseThrow { NoSuchElementException("PurchaseOrder not found with id: $id") }
        purchaseOrder.cancelOrder()
        return purchaseOrderRepository.save(purchaseOrder).toTO()
    }

    override fun reverseOrder(id: Long): PurchaseOrderTO {
        val purchaseOrder =
            purchaseOrderRepository.findById(id)
                .orElseThrow { NoSuchElementException("PurchaseOrder not found with id: $id") }
        purchaseOrder.reverseOrder()
        return purchaseOrderRepository.save(purchaseOrder).toTO()
    }

    private fun mapInputOrderItemToOrderItem(
        item: PurchaseItemInputTO,
        productMapById: Map<Long, Product>,
    ): PurchaseOrderItem {
        val product = productMapById.getValue(item.productId)

        return when (product.type) {
            Product.ProductType.MATERIAL ->
                PurchaseOrderItem(
                    item.productId,
                    TransactionProductType.MATERIAL,
                    item.quantity,
                    item.unitPrice,
                    serialNumber = null,
                    batchCode = UUID.randomUUID(),
                )

            Product.ProductType.ASSET -> {
                requireNotNull(item.serialNumber) { "asset item's serial number must not be null" }
                PurchaseOrderItem(
                    item.productId,
                    TransactionProductType.ASSET,
                    1,
                    item.unitPrice,
                    serialNumber = item.serialNumber,
                    batchCode = null,
                )
            }
        }
    }
}
