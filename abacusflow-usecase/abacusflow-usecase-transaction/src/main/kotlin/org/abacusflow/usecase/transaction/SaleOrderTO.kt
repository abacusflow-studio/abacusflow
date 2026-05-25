package org.abacusflow.usecase.transaction

import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class SaleOrderTO(
    val id: Long,
    val orderNo: UUID,
    val customerId: Long,
    val status: String,
    val note: String?,
    val items: List<SaleOrderItemTO>,
    val createdAt: Instant,
    val updatedAt: Instant,
    val orderDate: LocalDate,
) {
    data class SaleOrderItemTO(
        val id: Long,
        val inventoryUnitId: Long,
        val inventoryUnitTitle: String,
        val quantity: Int,
        val unitPrice: BigDecimal,
        val discountedPrice: BigDecimal,
        val subtotal: BigDecimal,
    )
}
