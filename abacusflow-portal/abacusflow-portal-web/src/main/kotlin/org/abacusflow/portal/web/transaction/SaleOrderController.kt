package org.abacusflow.portal.web.transaction

import org.abacusflow.portal.web.api.SaleOrdersApi
import org.abacusflow.portal.web.model.CreateSaleOrderInputVO
import org.abacusflow.portal.web.model.ListBasicSaleOrdersPage200ResponseVO
import org.abacusflow.portal.web.model.SaleOrderVO
import org.abacusflow.usecase.transaction.CreateSaleOrderInputTO
import org.abacusflow.usecase.transaction.service.SaleOrderCommandService
import org.abacusflow.usecase.transaction.service.SaleOrderQueryService
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.util.UUID

@RestController
class SaleOrderController(
    private val saleOrderCommandService: SaleOrderCommandService,
    private val saleOrderQueryService: SaleOrderQueryService,
) : SaleOrdersApi {
    @PreAuthorize("hasAuthority('sale-order:read')")
    override fun listBasicSaleOrdersPage(
        pageIndex: Int,
        pageSize: Int,
        orderNo: UUID?,
        customerName: String?,
        status: String?,
        inventoryUnitName: String?,
        orderDate: LocalDate?,
    ): ResponseEntity<ListBasicSaleOrdersPage200ResponseVO> {
        val pageable = PageRequest.of(pageIndex - 1, pageSize)

        val page =
            saleOrderQueryService.listBasicSaleOrdersPage(
                pageable,
                orderNo = orderNo,
                customerName = customerName,
                status = status,
                inventoryUnitName = inventoryUnitName,
                orderDate = orderDate,
            ).map { it.toBasicVO() }

        val pageVO =
            ListBasicSaleOrdersPage200ResponseVO(
                content = page.content,
                totalElements = page.totalElements,
                number = page.number,
                propertySize = page.size,
            )

        return ResponseEntity.ok(pageVO)
    }

    @PreAuthorize("hasAuthority('sale-order:read')")
    override fun getSaleOrder(id: Long): ResponseEntity<SaleOrderVO> {
        val order = saleOrderQueryService.getSaleOrder(id)
        return ResponseEntity.ok(
            order.toVO(),
        )
    }

    @PreAuthorize("hasAuthority('sale-order:create')")
    override fun addSaleOrder(createSaleOrderInputVO: CreateSaleOrderInputVO): ResponseEntity<SaleOrderVO> {
        val order =
            saleOrderCommandService.createSaleOrder(
                CreateSaleOrderInputTO(
                    createSaleOrderInputVO.customerId,
                    createSaleOrderInputVO.orderDate,
                    createSaleOrderInputVO.orderItems.map { it.toInputTO() },
                    createSaleOrderInputVO.note,
                ),
            )
        return ResponseEntity.ok(
            order.toVO(),
        )
    }

    @PreAuthorize("hasAuthority('sale-order:approve')")
    override fun completeSaleOrder(id: Long): ResponseEntity<Unit> {
        saleOrderCommandService.completeOrder(id)
        return ResponseEntity.ok().build()
    }

    @PreAuthorize("hasAuthority('sale-order:approve')")
    override fun cancelSaleOrder(id: Long): ResponseEntity<Unit> {
        saleOrderCommandService.cancelOrder(id)
        return ResponseEntity.ok().build()
    }

    @PreAuthorize("hasAuthority('sale-order:approve')")
    override fun reverseSaleOrder(id: Long): ResponseEntity<Unit> {
        saleOrderCommandService.reverseOrder(id)
        return ResponseEntity.ok().build()
    }
}
