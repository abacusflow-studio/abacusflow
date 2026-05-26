package org.abacusflow.usecase.transaction.service.impl

import org.abacusflow.db.transaction.PurchaseOrderRepository
import org.abacusflow.generated.jooq.Tables.PRODUCT
import org.abacusflow.generated.jooq.Tables.PURCHASE_ORDER
import org.abacusflow.generated.jooq.Tables.PURCHASE_ORDER_ITEM
import org.abacusflow.generated.jooq.Tables.SUPPLIER
import org.abacusflow.generated.jooq.enums.OrderStatusDbEnum
import org.abacusflow.transaction.OrderStatus
import org.abacusflow.usecase.transaction.BasicPurchaseOrderTO
import org.abacusflow.usecase.transaction.PurchaseOrderTO
import org.abacusflow.usecase.transaction.service.PurchaseOrderQueryService
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Service
class PurchaseOrderQueryServiceImpl(
    private val purchaseOrderRepository: PurchaseOrderRepository,
    private val jooqDsl: DSLContext,
) : PurchaseOrderQueryService {
    override fun listBasicPurchaseOrdersPage(
        pageable: Pageable,
        orderNo: UUID?,
        supplierName: String?,
        status: String?,
        productName: String?,
        serialNumber: String?,
        orderDate: LocalDate?,
    ): Page<BasicPurchaseOrderTO> {
        val conditions =
            mutableListOf<Condition>().apply {
                orderNo?.let {
                    add(PURCHASE_ORDER.NO.eq(it))
                }

                orderDate?.let {
                    add(PURCHASE_ORDER.ORDER_DATE.eq(it))
                }

                supplierName?.takeIf { it.isNotBlank() }?.let {
                    add(SUPPLIER.NAME.containsIgnoreCase(it))
                }

                status?.takeIf { it.isNotBlank() }?.let {
                    val statusEnum =
                        when (it.uppercase()) {
                            "PENDING" -> OrderStatusDbEnum.PENDING
                            "COMPLETED" -> OrderStatusDbEnum.COMPLETED
                            "CANCELED" -> OrderStatusDbEnum.CANCELED
                            "REVERSED" -> OrderStatusDbEnum.REVERSED
                            else -> throw IllegalArgumentException("Order status not supported: $it")
                        }
                    add(PURCHASE_ORDER.STATUS.eq(statusEnum))
                }

                productName?.takeIf { it.isNotBlank() }?.let {
                    add(PRODUCT.NAME.containsIgnoreCase(it))
                }
                serialNumber?.takeIf { it.isNotBlank() }?.let {
                    add(PURCHASE_ORDER_ITEM.SERIAL_NUMBER.eq(it.uppercase()))
                }
            }

        val joinedTables =
            PURCHASE_ORDER
                .leftJoin(SUPPLIER).on(PURCHASE_ORDER.SUPPLIER_ID.eq(SUPPLIER.ID))
                .leftJoin(PURCHASE_ORDER_ITEM).on(PURCHASE_ORDER_ITEM.ORDER_ID.eq(PURCHASE_ORDER.ID))
                .leftJoin(PRODUCT).on(PURCHASE_ORDER_ITEM.PRODUCT_ID.eq(PRODUCT.ID))

        val total =
            jooqDsl
                .select(DSL.countDistinct(PURCHASE_ORDER.ID))
                .from(joinedTables)
                .where(conditions)
                .fetchOne(0, Long::class.java) ?: 0L

        val totalAmountField =
            DSL.sum(PURCHASE_ORDER_ITEM.UNIT_PRICE.mul(PURCHASE_ORDER_ITEM.QUANTITY)).`as`("total_amount")
        val totalQuantityField = DSL.sum(PURCHASE_ORDER_ITEM.QUANTITY).`as`("total_quantity")
        val itemCountField = DSL.countDistinct(PURCHASE_ORDER_ITEM.ID).`as`("item_count")

        val records =
            jooqDsl
                .select(
                    PURCHASE_ORDER.ID,
                    PURCHASE_ORDER.NO,
                    PURCHASE_ORDER.STATUS,
                    PURCHASE_ORDER.CREATED_AT,
                    PURCHASE_ORDER.ORDER_DATE,
                    SUPPLIER.NAME,
                    totalAmountField,
                    totalQuantityField,
                    itemCountField,
                )
                .from(joinedTables)
                .where(conditions)
                .groupBy(
                    PURCHASE_ORDER.ID,
                    PURCHASE_ORDER.NO,
                    PURCHASE_ORDER.STATUS,
                    PURCHASE_ORDER.CREATED_AT,
                    PURCHASE_ORDER.ORDER_DATE,
                    SUPPLIER.NAME,
                )
                .orderBy(PURCHASE_ORDER.CREATED_AT.desc())
                .offset(pageable.offset)
                .limit(pageable.pageSize)
                .fetch()
                .map {
                    val status = it[PURCHASE_ORDER.STATUS]!!
                    val createdAt = it[PURCHASE_ORDER.CREATED_AT]!!
                    val autoCompleteDate: LocalDate? =
                        if (status.name == OrderStatus.PENDING.name) {
                            createdAt.plusDays(7).toLocalDate()
                        } else {
                            null
                        }

                    BasicPurchaseOrderTO(
                        id = it[PURCHASE_ORDER.ID]!!,
                        orderNo = it[PURCHASE_ORDER.NO]!!,
                        status = it[PURCHASE_ORDER.STATUS].name,
                        createdAt = it[PURCHASE_ORDER.CREATED_AT]!!.toInstant(),
                        orderDate = it[PURCHASE_ORDER.ORDER_DATE],
                        autoCompleteDate = autoCompleteDate,
                        supplierName = it[SUPPLIER.NAME] ?: "unknown",
                        totalAmount = it.get("total_amount", BigDecimal::class.java) ?: BigDecimal.ZERO,
                        totalQuantity = it.get("total_quantity", Long::class.java) ?: 0,
                        itemCount = it.get("item_count", Int::class.java) ?: 0,
                    )
                }

        return PageImpl(records, pageable, total)
    }

    override fun getPurchaseOrder(id: Long): PurchaseOrderTO {
        val order =
            jooqDsl
                .select(
                    PURCHASE_ORDER.ID,
                    PURCHASE_ORDER.NO,
                    PURCHASE_ORDER.SUPPLIER_ID,
                    PURCHASE_ORDER.STATUS,
                    PURCHASE_ORDER.ORDER_DATE,
                    PURCHASE_ORDER.NOTE,
                    PURCHASE_ORDER.CREATED_AT,
                    PURCHASE_ORDER.UPDATED_AT,
                )
                .from(PURCHASE_ORDER)
                .where(PURCHASE_ORDER.ID.eq(id))
                .fetchOne()
                ?: throw NoSuchElementException("PurchaseOrder not found with id: $id")

        val items =
            jooqDsl
                .select(
                    PURCHASE_ORDER_ITEM.ID,
                    PURCHASE_ORDER_ITEM.PRODUCT_ID,
                    PRODUCT.NAME,
                    PURCHASE_ORDER_ITEM.QUANTITY,
                    PURCHASE_ORDER_ITEM.UNIT_PRICE,
                    PURCHASE_ORDER_ITEM.SERIAL_NUMBER,
                )
                .from(PURCHASE_ORDER_ITEM)
                .leftJoin(PRODUCT).on(PURCHASE_ORDER_ITEM.PRODUCT_ID.eq(PRODUCT.ID))
                .where(PURCHASE_ORDER_ITEM.ORDER_ID.eq(id))
                .fetch()
                .map {
                    PurchaseOrderTO.PurchaseOrderItemTO(
                        id = it[PURCHASE_ORDER_ITEM.ID]!!,
                        productId = it[PURCHASE_ORDER_ITEM.PRODUCT_ID]!!,
                        productName = it[PRODUCT.NAME] ?: "未知产品",
                        quantity = it[PURCHASE_ORDER_ITEM.QUANTITY]!!,
                        unitPrice = it[PURCHASE_ORDER_ITEM.UNIT_PRICE]!!,
                        subtotal =
                            it[PURCHASE_ORDER_ITEM.UNIT_PRICE]!!.multiply(
                                it[PURCHASE_ORDER_ITEM.QUANTITY]!!.toBigDecimal(),
                            ),
                        serialNumber = it[PURCHASE_ORDER_ITEM.SERIAL_NUMBER],
                    )
                }

        return PurchaseOrderTO(
            id = order[PURCHASE_ORDER.ID]!!,
            orderNo = order[PURCHASE_ORDER.NO]!!,
            supplierId = order[PURCHASE_ORDER.SUPPLIER_ID]!!,
            status = order[PURCHASE_ORDER.STATUS].name,
            orderDate = order[PURCHASE_ORDER.ORDER_DATE]!!,
            items = items,
            note = order[PURCHASE_ORDER.NOTE],
            createdAt = order[PURCHASE_ORDER.CREATED_AT]!!.toInstant(),
            updatedAt = order[PURCHASE_ORDER.UPDATED_AT]!!.toInstant(),
        )
    }
}
