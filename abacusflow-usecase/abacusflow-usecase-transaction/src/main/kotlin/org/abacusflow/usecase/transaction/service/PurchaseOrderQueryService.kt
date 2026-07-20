package org.abacusflow.usecase.transaction.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.transaction.BasicPurchaseOrderTO
import org.abacusflow.usecase.transaction.PurchaseOrderTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize
import java.time.LocalDate
import java.util.UUID

interface PurchaseOrderQueryService {
    @PreAuthorize(RequiredAuthority.BUSINESS_PURCHASE_ORDER_READ)
    fun listBasicPurchaseOrdersPage(
        pageable: Pageable,
        orderNo: UUID?,
        supplierName: String?,
        status: String?,
        productName: String?,
        serialNumber: String?,
        orderDate: LocalDate?,
    ): Page<BasicPurchaseOrderTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_PURCHASE_ORDER_READ)
    fun getPurchaseOrder(id: Long): PurchaseOrderTO
}
