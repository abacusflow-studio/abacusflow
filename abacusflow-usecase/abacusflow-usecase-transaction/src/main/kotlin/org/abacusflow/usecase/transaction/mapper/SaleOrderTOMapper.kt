package org.abacusflow.usecase.transaction.mapper

import org.abacusflow.transaction.SaleOrder
import org.abacusflow.transaction.SaleOrderItem
import org.abacusflow.usecase.transaction.SaleOrderTO

fun SaleOrder.toTO() =
    SaleOrderTO(
        id = id,
        customerId = customerId,
        status = status.name,
        items = items.map { it.toTO() },
        createdAt = createdAt,
        updatedAt = updatedAt,
        orderNo = no,
        orderDate = orderDate,
        note = note,
    )

fun SaleOrderItem.toTO() =
    SaleOrderTO.SaleOrderItemTO(
        id = id,
        quantity = quantity,
        unitPrice = unitPrice,
        discountedPrice = discountedPrice,
        subtotal = subtotal,
        inventoryUnitId = inventoryUnitId,
        inventoryUnitTitle = "", // TODO
    )
