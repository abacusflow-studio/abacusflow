package org.abacusflow.depot

class DepotCreatedEvent(
    val depotId: Long,
    val tenantId: Long,
)

class DepotUpdatedEvent(
    val depotId: Long,
    val tenantId: Long,
)
