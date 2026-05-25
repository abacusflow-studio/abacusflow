package org.abacusflow.usecase.inventory.service.impl

import com.fasterxml.jackson.databind.ObjectMapper
import org.abacusflow.db.inventory.InventoryRepository
import org.abacusflow.generated.jooq.Tables.DEPOT
import org.abacusflow.generated.jooq.Tables.INVENTORY
import org.abacusflow.generated.jooq.Tables.INVENTORY_UNIT
import org.abacusflow.generated.jooq.Tables.PRODUCT
import org.abacusflow.generated.jooq.Tables.PRODUCT_CATEGORY
import org.abacusflow.generated.jooq.Tables.PURCHASE_ORDER
import org.abacusflow.generated.jooq.Tables.SALE_ORDER
import org.abacusflow.generated.jooq.enums.ProductTypeDbEnum
import org.abacusflow.inventory.InventoryUnit
import org.abacusflow.product.Product
import org.abacusflow.usecase.inventory.BasicInventoryTO
import org.abacusflow.usecase.inventory.BasicInventoryUnitTO
import org.abacusflow.usecase.inventory.InventoryTO
import org.abacusflow.usecase.inventory.mapper.toTO
import org.abacusflow.usecase.inventory.service.InventoryQueryService
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Service
class InventoryQueryServiceImpl(
    private val inventoryRepository: InventoryRepository,
    private val jooqDsl: DSLContext,
    private val objectMapper: ObjectMapper,
) : InventoryQueryService {
    // TODO: 这是最佳实践吗这种kt代码group，不应该sqlgroup才是马
    override fun listBasicInventoriesPage(
        pageable: Pageable,
        productCategoryId: Long?,
        productName: String?,
        productType: String?,
        inventoryUnitCode: String?,
        depotName: String?,
    ): Page<BasicInventoryTO> {
        val condition =
            buildList<Condition> {
                productCategoryId?.let { catId ->
                    val categoryIds = findAllChildrenCategories(catId)
                    if (categoryIds.isNotEmpty()) {
                        add(PRODUCT.CATEGORY_ID.`in`(categoryIds))
                    } else {
                        add(DSL.noCondition())
                    }
                }

                productName?.takeIf { it.isNotBlank() }?.let {
                    add(PRODUCT.NAME.containsIgnoreCase(it))
                }

                productType?.let {
                    val typeEnum =
                        when (it.uppercase()) {
                            "MATERIAL" -> ProductTypeDbEnum.MATERIAL
                            "ASSET" -> ProductTypeDbEnum.ASSET
                            else -> throw IllegalArgumentException("Product type not supported: $it")
                        }
                    add(PRODUCT.TYPE.eq(typeEnum))
                }

                inventoryUnitCode?.takeIf { it.isNotBlank() }?.let { code ->
                    val upperCode = code.uppercase()

                    val condition =
                        try {
                            val uuid = UUID.fromString(upperCode)
                            INVENTORY_UNIT.BATCH_CODE.eq(uuid)
                        } catch (e: IllegalArgumentException) {
                            INVENTORY_UNIT.SERIAL_NUMBER.eq(upperCode)
                        }

                    add(condition)
                }

                depotName?.takeIf { it.isNotBlank() }?.let {
                    add(DEPOT.NAME.containsIgnoreCase(it))
                }
            }

        val total =
            jooqDsl
                .selectCount()
                .from(INVENTORY)
                .leftJoin(INVENTORY_UNIT).on(INVENTORY.ID.eq(INVENTORY_UNIT.INVENTORY_ID))
                .leftJoin(PRODUCT).on(INVENTORY.PRODUCT_ID.eq(PRODUCT.ID))
                .where(condition)
                .fetchOne(0, Int::class.java) ?: 0

        val records =
            jooqDsl
                .select(
                    INVENTORY.ID,
                    INVENTORY.PRODUCT_ID,
                    INVENTORY.SAFETY_STOCK,
                    INVENTORY.MAX_STOCK,
                    PRODUCT.NAME,
                    PRODUCT.SPECIFICATION,
                    PRODUCT.NOTE,
                    PRODUCT.TYPE,
                    INVENTORY_UNIT.ID,
                    INVENTORY_UNIT.UNIT_TYPE,
                    INVENTORY_UNIT.PURCHASE_ORDER_ID,
                    PURCHASE_ORDER.NO,
                    DEPOT.NAME,
                    INVENTORY_UNIT.INITIAL_QUANTITY,
                    INVENTORY_UNIT.QUANTITY,
                    INVENTORY_UNIT.FROZEN_QUANTITY,
                    INVENTORY_UNIT.UNIT_PRICE,
                    INVENTORY_UNIT.RECEIVED_AT,
                    INVENTORY_UNIT.BATCH_CODE,
                    INVENTORY_UNIT.SERIAL_NUMBER,
                    INVENTORY_UNIT.STATUS,
                    DSL.arrayAgg(SALE_ORDER.NO).`as`("sale_order_nos"),
                )
                .from(INVENTORY)
                .leftJoin(INVENTORY_UNIT).on(INVENTORY.ID.eq(INVENTORY_UNIT.INVENTORY_ID))
                .leftJoin(PRODUCT).on(INVENTORY.PRODUCT_ID.eq(PRODUCT.ID))
                .leftJoin(PURCHASE_ORDER).on(INVENTORY_UNIT.PURCHASE_ORDER_ID.eq(PURCHASE_ORDER.ID))
                .leftJoin(SALE_ORDER).on(
                    DSL.condition("{0} = ANY({1})", SALE_ORDER.ID, INVENTORY_UNIT.SALE_ORDER_IDS),
                )
                .leftJoin(DEPOT).on(INVENTORY_UNIT.DEPOT_ID.eq(DEPOT.ID))
                .where(condition)
                .groupBy(
                    INVENTORY.ID,
                    INVENTORY.PRODUCT_ID,
                    INVENTORY.SAFETY_STOCK,
                    INVENTORY.MAX_STOCK,
                    PRODUCT.NAME,
                    PRODUCT.SPECIFICATION,
                    PRODUCT.NOTE,
                    PRODUCT.TYPE,
                    INVENTORY_UNIT.ID,
                    INVENTORY_UNIT.UNIT_TYPE,
                    INVENTORY_UNIT.PURCHASE_ORDER_ID,
                    PURCHASE_ORDER.NO,
                    DEPOT.NAME,
                    INVENTORY_UNIT.INITIAL_QUANTITY,
                    INVENTORY_UNIT.QUANTITY,
                    INVENTORY_UNIT.FROZEN_QUANTITY,
                    INVENTORY_UNIT.UNIT_PRICE,
                    INVENTORY_UNIT.RECEIVED_AT,
                    INVENTORY_UNIT.BATCH_CODE,
                    INVENTORY_UNIT.SERIAL_NUMBER,
                    INVENTORY_UNIT.STATUS,
                )
                .orderBy(
                    // 排序将数量计数为 0 的记录推送到末尾
                    DSL.`when`(INVENTORY_UNIT.QUANTITY.eq(0L), 1).otherwise(0).asc(),
                    INVENTORY.CREATED_AT.desc(),
                )
                .offset(pageable.offset.toInt())
                .limit(pageable.pageSize)
                .fetch()

        val recordsGrouped =
            records.groupBy { it[INVENTORY.ID]!! }.map { (_, group) ->
                val first = group.first()

                val productType = first[PRODUCT.TYPE].toCoreProductType()

                val quantity = group.mapNotNull { it[INVENTORY_UNIT.QUANTITY] }.sumOf { it }
                val frozenQuantity = group.mapNotNull { it[INVENTORY_UNIT.FROZEN_QUANTITY] }.sumOf { it }

                BasicInventoryTO(
                    id = first[INVENTORY.ID]!!,
                    productName = first[PRODUCT.NAME]!!,
                    productSpecification = first[PRODUCT.SPECIFICATION],
                    productNote = first[PRODUCT.NOTE],
                    productType = productType.name,
                    quantity = group.mapNotNull { it[INVENTORY_UNIT.QUANTITY] }.sumOf { it },
                    initialQuantity = group.mapNotNull { it[INVENTORY_UNIT.INITIAL_QUANTITY] }.sumOf { it },
                    remainingQuantity = quantity - frozenQuantity,
                    depotNames = group.mapNotNull { it[DEPOT.NAME] },
                    safetyStock = first[INVENTORY.SAFETY_STOCK],
                    maxStock = first[INVENTORY.MAX_STOCK],
                    units = group.mapNotNull { it.toBasicInventoryUnitTO() },
                )
            }

        return PageImpl(recordsGrouped, pageable, total.toLong())
    }

    override fun getInventory(id: Long): InventoryTO {
        return inventoryRepository
            .findById(id)
            .orElseThrow { NoSuchElementException("Inventory not found with id: $id") }
            .toTO()
    }

    fun ProductTypeDbEnum.toCoreProductType(): Product.ProductType =
        when (this) {
            ProductTypeDbEnum.MATERIAL -> Product.ProductType.MATERIAL
            ProductTypeDbEnum.ASSET -> Product.ProductType.ASSET
        }

    private fun findAllChildrenCategories(categoryId: Long): List<Long> {
        val result = mutableSetOf<Long>()
        val queue = mutableListOf(categoryId)

        while (queue.isNotEmpty()) {
            val currentId = queue.removeAt(0)
            result.add(currentId)

            // 查询直接子分类
            val children =
                jooqDsl
                    .select(PRODUCT_CATEGORY.ID)
                    .from(PRODUCT_CATEGORY)
                    .where(PRODUCT_CATEGORY.PARENT_ID.eq(currentId))
                    .fetch()
                    .map { it.value1() }

            queue.addAll(children)
        }

        return result.toList()
    }

    fun Record.toBasicInventoryUnitTO(): BasicInventoryUnitTO? {
        val id = this[INVENTORY_UNIT.ID] ?: return null

        val unitType: InventoryUnit.UnitType = InventoryUnit.UnitType.valueOf(this[INVENTORY_UNIT.UNIT_TYPE]!!)

        val title: String =
            when (unitType) {
                InventoryUnit.UnitType.BATCH -> "${this[PRODUCT.NAME]}-${this[INVENTORY_UNIT.BATCH_CODE]}"
                InventoryUnit.UnitType.INSTANCE -> "${this[PRODUCT.NAME]}-${this[INVENTORY_UNIT.SERIAL_NUMBER]}"
            }
        val saleOrderNos: List<UUID> =
            this.get("sale_order_nos", Array<UUID>::class.java)
                ?.toList() ?: emptyList()

        val quantity = this[INVENTORY_UNIT.QUANTITY] ?: 0L
        val frozenQuantity = this[INVENTORY_UNIT.FROZEN_QUANTITY] ?: 0L

        return BasicInventoryUnitTO(
            id = id,
            title = title,
            type = unitType.name, // 通常是枚举/字符串，如 "INSTANCE" 或 "BATCH"
            purchaseOrderId = this[INVENTORY_UNIT.PURCHASE_ORDER_ID],
            purchaseOrderNo = this[PURCHASE_ORDER.NO],
            saleOrderIds = this[INVENTORY_UNIT.SALE_ORDER_IDS]?.toList() ?: emptyList(),
            saleOrderNos = saleOrderNos,
            depotName = this[DEPOT.NAME],
            initialQuantity = this[INVENTORY_UNIT.INITIAL_QUANTITY] ?: 0L,
            quantity = quantity,
            remainingQuantity = quantity - frozenQuantity,
            unitPrice = this[INVENTORY_UNIT.UNIT_PRICE] ?: BigDecimal.ZERO,
            receivedAt = this[INVENTORY_UNIT.RECEIVED_AT]?.toInstant() ?: Instant.EPOCH,
            batchCode = this[INVENTORY_UNIT.BATCH_CODE],
            serialNumber = this[INVENTORY_UNIT.SERIAL_NUMBER],
            status = this[INVENTORY_UNIT.STATUS].name,
        )
    }
}
