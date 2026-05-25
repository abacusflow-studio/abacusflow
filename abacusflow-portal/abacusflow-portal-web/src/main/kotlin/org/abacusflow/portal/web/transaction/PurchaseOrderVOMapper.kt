package org.abacusflow.portal.web.transaction

import org.abacusflow.portal.web.model.BasicPurchaseOrderVO
import org.abacusflow.portal.web.model.OrderStatusVO
import org.abacusflow.portal.web.model.PurchaseOrderItemInputVO
import org.abacusflow.portal.web.model.PurchaseOrderItemVO
import org.abacusflow.portal.web.model.PurchaseOrderVO
import org.abacusflow.usecase.transaction.BasicPurchaseOrderTO
import org.abacusflow.usecase.transaction.PurchaseItemInputTO
import org.abacusflow.usecase.transaction.PurchaseOrderTO
import java.math.BigDecimal

fun BasicPurchaseOrderTO.toBasicVO(): BasicPurchaseOrderVO =
    BasicPurchaseOrderVO(
        id = id,
        orderNo = orderNo.toString(),
        supplierName = supplierName,
        status = mapOrderStatusTOToVO(status),
        totalAmount = totalAmount.toDouble(),
        totalQuantity = totalQuantity,
        itemCount = itemCount,
        orderDate = orderDate,
        autoCompleteDate = autoCompleteDate,
        createdAt = createdAt.toEpochMilli(),
    )

fun PurchaseOrderTO.toVO(): PurchaseOrderVO =
    PurchaseOrderVO(
        id = id,
        orderNo = orderNo.toString(),
        supplierId = supplierId,
        status = mapOrderStatusTOToVO(status),
        orderDate = orderDate,
        orderItems = items.map { it.toVO() },
        note = note,
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli(),
    )

fun PurchaseOrderTO.PurchaseOrderItemTO.toVO(): PurchaseOrderItemVO =
    PurchaseOrderItemVO(
        id = id,
        productId = productId,
        productName = productName,
        quantity = quantity,
        unitPrice = unitPrice.toDouble(),
        subtotal = subtotal.toDouble(),
        serialNumber = serialNumber,
    )

fun PurchaseOrderItemInputVO.toInputTO(): PurchaseItemInputTO =
    PurchaseItemInputTO(
        productId = productId,
        quantity = quantity,
        unitPrice = BigDecimal.valueOf(unitPrice),
        serialNumber = serialNumber,
    )

fun mapOrderStatusTOToVO(orderStatus: String): OrderStatusVO =
    when (orderStatus.uppercase()) {
        "PENDING" -> OrderStatusVO.pending
        "COMPLETED" -> OrderStatusVO.completed
        "CANCELED" -> OrderStatusVO.canceled
        "REVERSED" -> OrderStatusVO.reversed
        else -> throw IllegalArgumentException("Unknown order status: $orderStatus")
    }
