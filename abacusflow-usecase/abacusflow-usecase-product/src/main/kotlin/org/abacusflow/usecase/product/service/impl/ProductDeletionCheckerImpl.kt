package org.abacusflow.usecase.product.service.impl

import org.abacusflow.db.inventory.InventoryUnitRepository
import org.abacusflow.db.transaction.PurchaseOrderItemRepository
import org.abacusflow.db.transaction.SaleOrderItemRepository
import org.abacusflow.product.Product
import org.abacusflow.product.service.ProductDeletionChecker
import org.springframework.stereotype.Service

@Service
class ProductDeletionCheckerImpl(
    private val inventoryUnitRepository: InventoryUnitRepository,
    private val saleOrderItemRepository: SaleOrderItemRepository,
    private val purchaseOrderItemRepository: PurchaseOrderItemRepository,
) : ProductDeletionChecker {
    override fun canDelete(product: Product): Boolean {
        val productId = product.id

        // 查询所有与该产品相关的库存单位
        val relatedInventoryUnits = inventoryUnitRepository.findByInventoryProductId(productId)
        val relatedInventoryUnitIds = relatedInventoryUnits.map { it.id }

        val noPurchaseOrder = purchaseOrderItemRepository.countByProductId(productId) == 0L
        val noSaleOrder =
            if (relatedInventoryUnitIds.isEmpty()) {
                true // 没有库存单位就说明没有入库更是没有销售绑定
            } else {
                saleOrderItemRepository.countByInventoryUnitIdIn(relatedInventoryUnitIds) == 0L
            }

        return noPurchaseOrder && noSaleOrder
    }
}
