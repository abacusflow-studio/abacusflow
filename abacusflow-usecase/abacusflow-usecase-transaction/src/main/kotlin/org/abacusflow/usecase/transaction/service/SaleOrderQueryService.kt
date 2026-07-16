package org.abacusflow.usecase.transaction.service

import org.abacusflow.usecase.transaction.BasicSaleOrderTO
import org.abacusflow.usecase.transaction.SaleOrderTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize
import java.time.LocalDate
import java.util.UUID

interface SaleOrderQueryService {
    @PreAuthorize("hasAuthority('sale-order:read')")
    fun listBasicSaleOrdersPage(
        pageable: Pageable,
        orderNo: UUID?,
        customerName: String?,
        status: String?,
        inventoryUnitName: String?,
        orderDate: LocalDate?,
    ): Page<BasicSaleOrderTO>

    @PreAuthorize("hasAuthority('sale-order:read')")
    fun getSaleOrder(id: Long): SaleOrderTO
}
