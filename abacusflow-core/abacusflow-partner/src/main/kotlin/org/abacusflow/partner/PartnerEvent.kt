package org.abacusflow.partner

class CustomerCreatedEvent(
    val customerId: Long,
    val tenantId: Long,
)

class CustomerUpdatedEvent(
    val customerId: Long,
    val tenantId: Long,
)

class SupplierCreatedEvent(
    val supplierId: Long,
    val tenantId: Long,
)

class SupplierUpdatedEvent(
    val supplierId: Long,
    val tenantId: Long,
)
