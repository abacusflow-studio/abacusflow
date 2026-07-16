package org.abacusflow.product

class ProductCreatedEvent(
    val product: Product,
    val tenantId: Long = product.tenantId,
)

class ProductDeletedEvent(
    val product: Product,
    val tenantId: Long = product.tenantId,
)

// class ProductUpdatedEvent(
//    val product: Product,
// )
