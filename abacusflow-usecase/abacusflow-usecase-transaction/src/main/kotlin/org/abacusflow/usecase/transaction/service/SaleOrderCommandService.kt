package org.abacusflow.usecase.transaction.service

import org.abacusflow.usecase.transaction.CreateSaleOrderInputTO
import org.abacusflow.usecase.transaction.SaleOrderTO
import org.springframework.security.access.prepost.PreAuthorize

interface SaleOrderCommandService {
    /**
     * 创建销售订单（包含订单项）
     */
    @PreAuthorize("hasAuthority('sale-order:create')")
    fun createSaleOrder(input: CreateSaleOrderInputTO): SaleOrderTO

    /**
     * 完成订单（会触发领域事件用于库存扣减）
     */
    @PreAuthorize("hasAuthority('sale-order:approve')")
    fun completeOrder(id: Long): SaleOrderTO

    /**
     * 取消订单
     */
    @PreAuthorize("hasAuthority('sale-order:approve')")
    fun cancelOrder(id: Long): SaleOrderTO

    @PreAuthorize("hasAuthority('sale-order:approve')")
    fun reverseOrder(id: Long): SaleOrderTO
}
