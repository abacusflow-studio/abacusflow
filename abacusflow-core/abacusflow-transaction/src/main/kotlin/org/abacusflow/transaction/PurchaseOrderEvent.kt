package org.abacusflow.transaction

class PurchaseOrderCreatedEvent(
    val order: PurchaseOrder,
    val tenantId: Long = order.tenantId,
)

class PurchaseOrderCompletedEvent(
    val order: PurchaseOrder,
    val tenantId: Long = order.tenantId,
)

class PurchaseOrderCanceledEvent(
    val order: PurchaseOrder,
    val tenantId: Long = order.tenantId,
)

class PurchaseOrderReversedEvent(
    val order: PurchaseOrder,
    val tenantId: Long = order.tenantId,
)
