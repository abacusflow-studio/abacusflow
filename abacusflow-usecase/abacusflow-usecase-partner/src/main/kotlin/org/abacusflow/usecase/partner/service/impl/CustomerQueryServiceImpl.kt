package org.abacusflow.usecase.partner.service.impl

import org.abacusflow.db.partner.CustomerRepository
import org.abacusflow.generated.jooq.Tables.CUSTOMER
import org.abacusflow.generated.jooq.Tables.SALE_ORDER
import org.abacusflow.generated.jooq.Tables.SALE_ORDER_ITEM
import org.abacusflow.generated.jooq.enums.OrderStatusDbEnum
import org.abacusflow.generated.jooq.tables.records.CustomerRecord
import org.abacusflow.usecase.partner.BasicCustomerTO
import org.abacusflow.usecase.partner.CustomerTO
import org.abacusflow.usecase.partner.mapper.toTO
import org.abacusflow.usecase.partner.service.CustomerQueryService
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import kotlin.jvm.java

@Service
@Transactional(readOnly = true)
class CustomerQueryServiceImpl(
    private val customerRepository: CustomerRepository,
    private val jooqDsl: DSLContext,
) : CustomerQueryService {
    override fun getCustomer(id: Long): CustomerTO {
        return customerRepository
            .findById(id)
            .orElseThrow { NoSuchElementException("Customer not found with id: $id") }
            .toTO()
    }

    override fun getCustomer(name: String): CustomerTO {
        return customerRepository
            .findByName(name)
            ?.toTO()
            ?: throw NoSuchElementException("Customer not found")
    }

    override fun listBasicCustomersPage(
        pageable: Pageable,
        name: String?,
        phone: String?,
        address: String?,
    ): Page<BasicCustomerTO> {
        val conditions =
            mutableListOf<Condition>().apply {
                name?.takeIf { it.isNotBlank() }?.let {
                    add(CUSTOMER.NAME.containsIgnoreCase(it))
                }

                phone?.takeIf { it.isNotBlank() }?.let {
                    add(CUSTOMER.PHONE.containsIgnoreCase(it))
                }

                address?.takeIf { it.isNotBlank() }?.let {
                    add(CUSTOMER.ADDRESS.containsIgnoreCase(it))
                }
            }

        // 1. 查询总数
        val total =
            jooqDsl
                .selectCount()
                .from(CUSTOMER)
                .where(conditions)
                .fetchOne(0, Long::class.java) ?: 0L

        // 2. 查询分页数据，明确列出字段
        val records =
            jooqDsl
                .select(
                    CUSTOMER.ID,
                    CUSTOMER.NAME,
                    CUSTOMER.PHONE,
                    CUSTOMER.ADDRESS,
                    // 聚合字段
                    DSL.countDistinct(SALE_ORDER.ID)
                        .filterWhere(SALE_ORDER.STATUS.eq(OrderStatusDbEnum.COMPLETED))
                        .`as`("total_order_count"),
                    DSL.sum(
                        SALE_ORDER_ITEM.UNIT_PRICE
                            .mul(SALE_ORDER_ITEM.QUANTITY)
                            .mul(SALE_ORDER_ITEM.DISCOUNT_FACTOR),
                    ).filterWhere(SALE_ORDER.STATUS.eq(OrderStatusDbEnum.COMPLETED))
                        .`as`("total_order_amount"),
                    DSL.max(SALE_ORDER.ORDER_DATE).`as`("last_order_date"),
                )
                .from(CUSTOMER)
                .leftJoin(SALE_ORDER).on(SALE_ORDER.CUSTOMER_ID.eq(CUSTOMER.ID))
                .leftJoin(SALE_ORDER_ITEM).on(SALE_ORDER_ITEM.ORDER_ID.eq(SALE_ORDER.ID))
                .where(conditions)
                .groupBy(
                    CUSTOMER.ID,
                    CUSTOMER.NAME,
                    CUSTOMER.PHONE,
                    CUSTOMER.ADDRESS,
                )
                .orderBy(CUSTOMER.CREATED_AT.desc()) // 或 pageable.sort 转换
                .offset(pageable.offset)
                .limit(pageable.pageSize)
                .fetch()
                .map {
                    BasicCustomerTO(
                        id = it[CUSTOMER.ID]!!,
                        name = it[CUSTOMER.NAME]!!,
                        phone = it[CUSTOMER.PHONE],
                        address = it[CUSTOMER.ADDRESS],
                        totalOrderCount = it.get("total_order_count", Int::class.java) ?: 0,
                        totalOrderAmount = it.get("total_order_amount", BigDecimal::class.java) ?: BigDecimal.ZERO,
                        lastOrderDate = it.get("last_order_date", LocalDate::class.java),
                    )
                }

        return PageImpl(records, pageable, total)
    }

    override fun listCustomers(): List<CustomerTO> {
        return jooqDsl
            .selectFrom(CUSTOMER)
            .where(DSL.noCondition())
            .orderBy(CUSTOMER.CREATED_AT.desc())
            .fetch()
            .map { it.toTO() }
    }

    fun CustomerRecord.toTO(): CustomerTO {
        return CustomerTO(
            id = id,
            name = name,
            phone = phone,
            address = address,
            createdAt = createdAt.toInstant(),
            updatedAt = updatedAt.toInstant(),
        )
    }
}
