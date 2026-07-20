package org.abacusflow.usecase.transaction.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.transaction.CreatePurchaseOrderInputTO
import org.abacusflow.usecase.transaction.PurchaseOrderTO
import org.springframework.security.access.prepost.PreAuthorize

interface PurchaseOrderCommandService {
    @PreAuthorize(RequiredAuthority.BUSINESS_PURCHASE_ORDER_CREATE)
    fun createPurchaseOrder(input: CreatePurchaseOrderInputTO): PurchaseOrderTO

    @PreAuthorize(RequiredAuthority.BUSINESS_PURCHASE_ORDER_APPROVE)
    fun completeOrder(id: Long): PurchaseOrderTO

    @PreAuthorize(RequiredAuthority.BUSINESS_PURCHASE_ORDER_APPROVE)
    fun cancelOrder(id: Long): PurchaseOrderTO

    @PreAuthorize(RequiredAuthority.BUSINESS_PURCHASE_ORDER_APPROVE)
    fun reverseOrder(id: Long): PurchaseOrderTO
}
