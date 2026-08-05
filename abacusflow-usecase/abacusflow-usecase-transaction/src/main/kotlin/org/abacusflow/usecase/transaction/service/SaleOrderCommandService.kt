package org.abacusflow.usecase.transaction.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.transaction.CreateSaleOrderInputTO
import org.abacusflow.usecase.transaction.SaleOrderTO
import org.springframework.security.access.prepost.PreAuthorize

interface SaleOrderCommandService {
    /**
     * 创建销售订单（包含订单项）
     */
    @PreAuthorize(RequiredAuthority.BUSINESS_SALE_ORDER_CREATE)
    fun createSaleOrder(input: CreateSaleOrderInputTO): SaleOrderTO

    /**
     * 完成订单（会触发领域事件用于库存扣减）
     */
    @PreAuthorize(RequiredAuthority.BUSINESS_SALE_ORDER_APPROVE)
    fun completeOrder(id: Long): SaleOrderTO

    /**
     * 取消订单
     */
    @PreAuthorize(RequiredAuthority.BUSINESS_SALE_ORDER_APPROVE)
    fun cancelOrder(id: Long): SaleOrderTO

    @PreAuthorize(RequiredAuthority.BUSINESS_SALE_ORDER_APPROVE)
    fun reverseOrder(id: Long): SaleOrderTO
}
