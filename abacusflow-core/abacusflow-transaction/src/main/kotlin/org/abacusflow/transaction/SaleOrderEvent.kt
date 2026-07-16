package org.abacusflow.transaction

class SaleOrderCreatedEvent(
    val order: SaleOrder,
    val tenantId: Long = order.tenantId,
)

class SaleOrderCompletedEvent(
    val order: SaleOrder,
    val tenantId: Long = order.tenantId,
)

class SaleOrderCanceledEvent(
    val order: SaleOrder,
    val tenantId: Long = order.tenantId,
)

class SaleOrderReversedEvent(
    val order: SaleOrder,
    val tenantId: Long = order.tenantId,
)
