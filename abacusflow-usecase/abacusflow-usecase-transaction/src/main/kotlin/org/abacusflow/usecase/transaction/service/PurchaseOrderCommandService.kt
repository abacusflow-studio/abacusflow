package org.abacusflow.usecase.transaction.service

import org.abacusflow.usecase.transaction.CreatePurchaseOrderInputTO
import org.abacusflow.usecase.transaction.PurchaseOrderTO
import org.springframework.security.access.prepost.PreAuthorize

interface PurchaseOrderCommandService {
    @PreAuthorize("hasAuthority('purchase-order:create')")
    fun createPurchaseOrder(input: CreatePurchaseOrderInputTO): PurchaseOrderTO

    @PreAuthorize("hasAuthority('purchase-order:approve')")
    fun completeOrder(id: Long): PurchaseOrderTO

    @PreAuthorize("hasAuthority('purchase-order:approve')")
    fun cancelOrder(id: Long): PurchaseOrderTO

    @PreAuthorize("hasAuthority('purchase-order:approve')")
    fun reverseOrder(id: Long): PurchaseOrderTO
}
