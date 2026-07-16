package org.abacusflow.portal.web.transaction

import org.abacusflow.portal.web.api.PurchaseOrdersApi
import org.abacusflow.portal.web.model.CreatePurchaseOrderInputVO
import org.abacusflow.portal.web.model.ListBasicPurchaseOrdersPage200ResponseVO
import org.abacusflow.portal.web.model.PurchaseOrderVO
import org.abacusflow.usecase.transaction.CreatePurchaseOrderInputTO
import org.abacusflow.usecase.transaction.service.PurchaseOrderCommandService
import org.abacusflow.usecase.transaction.service.PurchaseOrderQueryService
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.util.UUID

@RestController
class PurchaseOrderController(
    private val purchaseOrderCommandService: PurchaseOrderCommandService,
    private val purchaseOrderQueryService: PurchaseOrderQueryService,
) : PurchaseOrdersApi {
    override fun listBasicPurchaseOrdersPage(
        pageIndex: Int,
        pageSize: Int,
        orderNo: UUID?,
        supplierName: String?,
        status: String?,
        productName: String?,
        serialNumber: String?,
        orderDate: LocalDate?,
    ): ResponseEntity<ListBasicPurchaseOrdersPage200ResponseVO> {
        val pageable = PageRequest.of(pageIndex - 1, pageSize)

        val page =
            purchaseOrderQueryService.listBasicPurchaseOrdersPage(
                pageable,
                orderNo = orderNo,
                supplierName = supplierName,
                status = status,
                productName = productName,
                serialNumber = serialNumber,
                orderDate = orderDate,
            ).map { it.toBasicVO() }

        val pageVO =
            ListBasicPurchaseOrdersPage200ResponseVO(
                content = page.content,
                totalElements = page.totalElements,
                number = page.number,
                propertySize = page.size,
            )

        return ResponseEntity.ok(pageVO)
    }

    override fun getPurchaseOrder(id: Long): ResponseEntity<PurchaseOrderVO> {
        val order = purchaseOrderQueryService.getPurchaseOrder(id)
        return ResponseEntity.ok(
            order.toVO(),
        )
    }

    override fun addPurchaseOrder(createPurchaseOrderInputVO: CreatePurchaseOrderInputVO): ResponseEntity<PurchaseOrderVO> {
        val order =
            purchaseOrderCommandService.createPurchaseOrder(
                CreatePurchaseOrderInputTO(
                    supplierId = createPurchaseOrderInputVO.supplierId,
                    orderDate = createPurchaseOrderInputVO.orderDate,
                    orderItems = createPurchaseOrderInputVO.orderItems.map { it.toInputTO() },
                    note = createPurchaseOrderInputVO.note,
                ),
            )
        return ResponseEntity.ok(
            order.toVO(),
        )
    }

    override fun completePurchaseOrder(id: Long): ResponseEntity<Unit> {
        purchaseOrderCommandService.completeOrder(id)
        return ResponseEntity.ok().build()
    }

    override fun cancelPurchaseOrder(id: Long): ResponseEntity<Unit> {
        purchaseOrderCommandService.cancelOrder(id)
        return ResponseEntity.ok().build()
    }

    override fun reversePurchaseOrder(id: Long): ResponseEntity<Unit> {
        purchaseOrderCommandService.reverseOrder(id)
        return ResponseEntity.ok().build()
    }
}
