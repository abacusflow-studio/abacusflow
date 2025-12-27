package org.abacusflow.usecase.inventory.service.impl

import org.abacusflow.db.inventory.InventoryUnitRepository
import org.abacusflow.generated.jooq.Tables.DEPOT
import org.abacusflow.generated.jooq.Tables.INVENTORY
import org.abacusflow.generated.jooq.Tables.INVENTORY_UNIT
import org.abacusflow.generated.jooq.Tables.PRODUCT
import org.abacusflow.generated.jooq.Tables.PRODUCT_CATEGORY
import org.abacusflow.generated.jooq.Tables.PURCHASE_ORDER
import org.abacusflow.generated.jooq.Tables.SALE_ORDER
import org.abacusflow.generated.jooq.Tables.SUPPLIER
import org.abacusflow.generated.jooq.enums.ProductTypeDbEnum
import org.abacusflow.inventory.InventoryUnit
import org.abacusflow.usecase.inventory.BasicInventoryUnitTO
import org.abacusflow.usecase.inventory.InventoryUnitForExportTO
import org.abacusflow.usecase.inventory.InventoryUnitTO
import org.abacusflow.usecase.inventory.InventoryUnitWithTitleTO
import org.abacusflow.usecase.inventory.mapper.toTO
import org.abacusflow.usecase.inventory.service.InventoryUnitQueryService
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
class InventoryUnitQueryServiceImpl(
    private val inventoryUnitRepository: InventoryUnitRepository,
    private val jooqDsl: DSLContext,
) : InventoryUnitQueryService {
    override fun listBasicInventoryUnits(
        pageable: Pageable,
        productCategoryId: Long?,
        productName: String?,
        productType: String?,
        inventoryUnitCode: String?,
        depotName: String?,
    ): Page<BasicInventoryUnitTO> {
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

        // 使用 JOOQ 执行联接查询
        val inventoryUnits =
            jooqDsl
                .select(
                    INVENTORY_UNIT.ID,
                    INVENTORY_UNIT.UNIT_TYPE,
                    INVENTORY_UNIT.BATCH_CODE,
                    INVENTORY_UNIT.SERIAL_NUMBER,
                    INVENTORY_UNIT.PURCHASE_ORDER_ID,
                    INVENTORY_UNIT.SALE_ORDER_IDS,
                    DEPOT.NAME,
                    INVENTORY_UNIT.INITIAL_QUANTITY,
                    INVENTORY_UNIT.QUANTITY,
                    INVENTORY_UNIT.FROZEN_QUANTITY,
                    INVENTORY_UNIT.UNIT_PRICE,
                    INVENTORY_UNIT.RECEIVED_AT,
                    INVENTORY.PRODUCT_ID,
                    INVENTORY_UNIT.STATUS,
                    PRODUCT.NAME,
                    PRODUCT.SPECIFICATION,
                    PURCHASE_ORDER.NO,
                    DSL.arrayAgg(SALE_ORDER.NO).`as`("sale_order_nos"),
                )
                .from(INVENTORY_UNIT)
                .leftJoin(INVENTORY).on(INVENTORY.ID.eq(INVENTORY_UNIT.INVENTORY_ID)) // 关联 INVENTORY 表
                .leftJoin(PRODUCT).on(PRODUCT.ID.eq(INVENTORY.PRODUCT_ID)) // 关联 Product 表
                .leftJoin(PURCHASE_ORDER)
                .on(PURCHASE_ORDER.ID.eq(INVENTORY_UNIT.PURCHASE_ORDER_ID)) // 关联 PurchaseOrder 表
                .leftJoin(SALE_ORDER).on(
                    DSL.condition("{0} = ANY({1})", SALE_ORDER.ID, INVENTORY_UNIT.SALE_ORDER_IDS),
                )
                .leftJoin(DEPOT).on(INVENTORY_UNIT.DEPOT_ID.eq(DEPOT.ID))
                .where(condition)
                .groupBy(
                    INVENTORY_UNIT.ID,
                    INVENTORY_UNIT.UNIT_TYPE,
                    INVENTORY_UNIT.BATCH_CODE,
                    INVENTORY_UNIT.SERIAL_NUMBER,
                    INVENTORY_UNIT.PURCHASE_ORDER_ID,
                    INVENTORY_UNIT.SALE_ORDER_IDS,
                    DEPOT.NAME,
                    INVENTORY_UNIT.INITIAL_QUANTITY,
                    INVENTORY_UNIT.QUANTITY,
                    INVENTORY_UNIT.FROZEN_QUANTITY,
                    INVENTORY_UNIT.UNIT_PRICE,
                    INVENTORY_UNIT.RECEIVED_AT,
                    INVENTORY_UNIT.STATUS,
                    INVENTORY.PRODUCT_ID,
                    PRODUCT.NAME,
                    PRODUCT.SPECIFICATION,
                    PURCHASE_ORDER.NO,
                )
                .orderBy(
                    // 排序将数量计数为 0 的记录推送到末尾
                    DSL.`when`(INVENTORY_UNIT.QUANTITY.eq(0L), 1).otherwise(0).asc(),
                    INVENTORY_UNIT.CREATED_AT.desc(),
                )
                .offset(pageable.offset.toInt())
                .limit(pageable.pageSize)
                .fetch()

        // 转换查询结果为 BasicInventoryUnitTO
        return PageImpl(
            inventoryUnits.map { record ->
                record.toBasicInventoryUnitTO()
            },
            pageable,
            total.toLong(),
        )
    }

    override fun listInventoryUnits(): List<InventoryUnitTO> {
        val inventoryUnits =
            jooqDsl
                .select(
                    INVENTORY_UNIT.ID,
                    INVENTORY_UNIT.UNIT_TYPE,
                    INVENTORY_UNIT.INVENTORY_ID,
                    INVENTORY_UNIT.PURCHASE_ORDER_ID,
                    INVENTORY_UNIT.INITIAL_QUANTITY,
                    INVENTORY_UNIT.QUANTITY,
                    INVENTORY_UNIT.FROZEN_QUANTITY,
                    INVENTORY_UNIT.UNIT_PRICE,
                    INVENTORY_UNIT.DEPOT_ID,
                    INVENTORY_UNIT.STATUS,
                    INVENTORY_UNIT.SALE_ORDER_IDS,
                    INVENTORY_UNIT.RECEIVED_AT,
                    INVENTORY_UNIT.CREATED_AT,
                    INVENTORY_UNIT.UPDATED_AT,
                    INVENTORY_UNIT.SERIAL_NUMBER,
                    INVENTORY_UNIT.BATCH_CODE,
                )
                .from(INVENTORY_UNIT)
                .orderBy(INVENTORY_UNIT.CREATED_AT.desc())
                .fetch()

        return inventoryUnits.map { record ->
            record.toInventoryUnitTO()
        }
    }

    override fun listInventoryUnitsForExport(productCategoryId: Long?): List<InventoryUnitForExportTO> {
        val condition =
            buildList {
                add(INVENTORY_UNIT.QUANTITY.gt(0))

                productCategoryId?.let { catId ->
                    val categoryIds = findAllChildrenCategories(catId)
                    if (categoryIds.isNotEmpty()) {
                        add(PRODUCT.CATEGORY_ID.`in`(categoryIds))
                    } else {
                        add(DSL.noCondition())
                    }
                }
            }

        // 使用 JOOQ 执行联接查询
        val inventoryUnits =
            jooqDsl
                .select(
                    INVENTORY_UNIT.UNIT_TYPE,
                    INVENTORY_UNIT.BATCH_CODE,
                    INVENTORY_UNIT.SERIAL_NUMBER,
                    INVENTORY_UNIT.PURCHASE_ORDER_ID,
                    INVENTORY_UNIT.SALE_ORDER_IDS,
                    DEPOT.NAME,
                    INVENTORY_UNIT.INITIAL_QUANTITY,
                    INVENTORY_UNIT.QUANTITY,
                    INVENTORY_UNIT.FROZEN_QUANTITY,
                    INVENTORY_UNIT.UNIT_PRICE,
                    INVENTORY_UNIT.RECEIVED_AT,
                    INVENTORY.PRODUCT_ID,
                    INVENTORY_UNIT.STATUS,
                    PRODUCT.NAME,
                    PRODUCT.SPECIFICATION,
                    PURCHASE_ORDER.NO,
                    DSL.arrayAgg(SALE_ORDER.NO).`as`("sale_order_nos"),
                    SUPPLIER.NAME
                )
                .from(INVENTORY_UNIT)
                .leftJoin(INVENTORY).on(INVENTORY.ID.eq(INVENTORY_UNIT.INVENTORY_ID)) // 关联 INVENTORY 表
                .leftJoin(PRODUCT).on(PRODUCT.ID.eq(INVENTORY.PRODUCT_ID)) // 关联 Product 表
                .leftJoin(PURCHASE_ORDER)
                .on(PURCHASE_ORDER.ID.eq(INVENTORY_UNIT.PURCHASE_ORDER_ID)) // 关联 PurchaseOrder 表
                .leftJoin(SUPPLIER)
                .on(SUPPLIER.ID.eq(PURCHASE_ORDER.SUPPLIER_ID)) // 关联 Supplier 表
                .leftJoin(SALE_ORDER).on(
                    DSL.condition("{0} = ANY({1})", SALE_ORDER.ID, INVENTORY_UNIT.SALE_ORDER_IDS),
                )
                .leftJoin(DEPOT).on(INVENTORY_UNIT.DEPOT_ID.eq(DEPOT.ID))
                .where(condition)
                .groupBy(
                    INVENTORY_UNIT.UNIT_TYPE,
                    INVENTORY_UNIT.BATCH_CODE,
                    INVENTORY_UNIT.SERIAL_NUMBER,
                    INVENTORY_UNIT.PURCHASE_ORDER_ID,
                    INVENTORY_UNIT.SALE_ORDER_IDS,
                    DEPOT.NAME,
                    INVENTORY_UNIT.INITIAL_QUANTITY,
                    INVENTORY_UNIT.QUANTITY,
                    INVENTORY_UNIT.FROZEN_QUANTITY,
                    INVENTORY_UNIT.UNIT_PRICE,
                    INVENTORY_UNIT.RECEIVED_AT,
                    INVENTORY_UNIT.STATUS,
                    INVENTORY.PRODUCT_ID,
                    PRODUCT.NAME,
                    PRODUCT.SPECIFICATION,
                    PURCHASE_ORDER.NO,
                    INVENTORY_UNIT.CREATED_AT,
                    SUPPLIER.NAME
                )
                .orderBy(INVENTORY_UNIT.CREATED_AT.desc())
                .fetch()

        // 转换查询结果
        return inventoryUnits.map { record ->
            record.toInventoryUnitForExportTO()
        }
    }

    override fun listInventoryUnitsWithTitle(statusList: List<String>?): List<InventoryUnitWithTitleTO> {
        val condition =
            buildList<Condition> {
                statusList?.let {
                    val upperCaseStatuses = statusList.map { it.uppercase() }
                    add(INVENTORY_UNIT.STATUS.`in`(upperCaseStatuses))
                }
            }

        val inventoryUnits =
            jooqDsl
                .selectDistinct(
                    INVENTORY_UNIT.ID,
                    INVENTORY_UNIT.UNIT_TYPE,
                    INVENTORY_UNIT.STATUS,
                    INVENTORY_UNIT.BATCH_CODE,
                    INVENTORY_UNIT.SERIAL_NUMBER,
                    PRODUCT.NAME,
                    PRODUCT.SPECIFICATION,
                    INVENTORY_UNIT.CREATED_AT,
                )
                .from(INVENTORY_UNIT)
                .leftJoin(INVENTORY).on(INVENTORY.ID.eq(INVENTORY_UNIT.INVENTORY_ID)) // 关联 INVENTORY 表
                .leftJoin(PRODUCT).on(PRODUCT.ID.eq(INVENTORY.PRODUCT_ID)) // 关联 Product 表
                .where(condition)
                .orderBy(INVENTORY_UNIT.CREATED_AT.desc())
                .fetch()

        return inventoryUnits.map { record ->
            record.toInventoryUnitWithTitleTO()
        }
    }

    override fun getInventoryUnit(id: Long): InventoryUnitTO? {
        return inventoryUnitRepository.findById(id)
            .orElseThrow { NoSuchElementException("Inventory not found with id: $id") }
            .toTO()
    }

    fun Record.toBasicInventoryUnitTO(): BasicInventoryUnitTO? {
        val id = this[INVENTORY_UNIT.ID] ?: return null

        val unitType: InventoryUnit.UnitType = InventoryUnit.UnitType.valueOf(this[INVENTORY_UNIT.UNIT_TYPE]!!)

        val title: String =
            when (unitType) {
                InventoryUnit.UnitType.BATCH ->
                    "${this[PRODUCT.NAME]}-${this[PRODUCT.SPECIFICATION]}" +
                        "-${this[INVENTORY_UNIT.BATCH_CODE]}"
                InventoryUnit.UnitType.INSTANCE ->
                    "${this[PRODUCT.NAME]}-${this[PRODUCT.SPECIFICATION]}" +
                        "-${this[INVENTORY_UNIT.SERIAL_NUMBER]}"
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
            purchaseOrderNo = this[PURCHASE_ORDER.NO]!!,
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

    fun Record.toInventoryUnitTO(): InventoryUnitTO {
        val unitType: InventoryUnit.UnitType = InventoryUnit.UnitType.valueOf(this[INVENTORY_UNIT.UNIT_TYPE]!!)

        val quantity = this[INVENTORY_UNIT.QUANTITY] ?: 0L
        val frozenQuantity = this[INVENTORY_UNIT.FROZEN_QUANTITY] ?: 0L

        return InventoryUnitTO(
            id = this[INVENTORY_UNIT.ID] ?: throw NoSuchElementException("InventoryUnit ID is missing"),
            type = unitType.name,
            inventoryId = this[INVENTORY_UNIT.INVENTORY_ID] ?: throw NoSuchElementException("Inventory ID is missing"),
            purchaseOrderId =
                this[INVENTORY_UNIT.PURCHASE_ORDER_ID]
                    ?: throw NoSuchElementException("Purchase Order ID is missing"),
            initialQuantity = this[INVENTORY_UNIT.INITIAL_QUANTITY] ?: 0L,
            quantity = quantity,
            remainingQuantity = quantity - frozenQuantity,
            unitPrice = this[INVENTORY_UNIT.UNIT_PRICE] ?: BigDecimal.ZERO,
            depotId = this[INVENTORY_UNIT.DEPOT_ID],
            status = this[INVENTORY_UNIT.STATUS].name,
            saleOrderIds = this[INVENTORY_UNIT.SALE_ORDER_IDS]?.toList() ?: emptyList(),
            receivedAt = this[INVENTORY_UNIT.RECEIVED_AT]?.toInstant() ?: Instant.EPOCH,
            createdAt = this[INVENTORY_UNIT.CREATED_AT]?.toInstant() ?: Instant.EPOCH,
            updatedAt = this[INVENTORY_UNIT.UPDATED_AT]?.toInstant() ?: Instant.EPOCH,
            serialNumber = this[INVENTORY_UNIT.SERIAL_NUMBER],
            batchCode = this[INVENTORY_UNIT.BATCH_CODE],
        )
    }

    fun Record.toInventoryUnitWithTitleTO(): InventoryUnitWithTitleTO {
        val unitType: InventoryUnit.UnitType = InventoryUnit.UnitType.valueOf(this[INVENTORY_UNIT.UNIT_TYPE]!!)
        val title: String =
            when (unitType) {
                InventoryUnit.UnitType.BATCH -> "${this[PRODUCT.NAME]}-批次号-${this[INVENTORY_UNIT.BATCH_CODE]}"
                InventoryUnit.UnitType.INSTANCE -> "${this[PRODUCT.NAME]}-序列号-${this[INVENTORY_UNIT.SERIAL_NUMBER]}"
            }
        return InventoryUnitWithTitleTO(
            id = this[INVENTORY_UNIT.ID] ?: throw NoSuchElementException("InventoryUnit ID is missing"),
            type = unitType.name,
            title = title,
            status = this[INVENTORY_UNIT.STATUS].name,
        )
    }

    fun Record.toInventoryUnitForExportTO(): InventoryUnitForExportTO? {
        val unitType: InventoryUnit.UnitType = InventoryUnit.UnitType.valueOf(this[INVENTORY_UNIT.UNIT_TYPE]!!)

        val title: String =
            when (unitType) {
                InventoryUnit.UnitType.BATCH ->
                    "${this[PRODUCT.NAME]}-${this[PRODUCT.SPECIFICATION]}" +
                        "-${this[INVENTORY_UNIT.BATCH_CODE]}"
                InventoryUnit.UnitType.INSTANCE ->
                    "${this[PRODUCT.NAME]}-${this[PRODUCT.SPECIFICATION]}" +
                        "-${this[INVENTORY_UNIT.SERIAL_NUMBER]}"
            }
        val saleOrderNos: List<UUID> =
            this.get("sale_order_nos", Array<UUID>::class.java)
                ?.toList() ?: emptyList()

        val quantity = this[INVENTORY_UNIT.QUANTITY] ?: 0L
        val frozenQuantity = this[INVENTORY_UNIT.FROZEN_QUANTITY] ?: 0L

        return InventoryUnitForExportTO(
            title = title,
            type = unitType.name, // 通常是枚举/字符串，如 "INSTANCE" 或 "BATCH"
            status = this[INVENTORY_UNIT.STATUS].name,
            purchaseOrderNo = this[PURCHASE_ORDER.NO]!!,
            saleOrderNos = saleOrderNos,
            depotName = this[DEPOT.NAME],
            supplierName = this[SUPPLIER.NAME]!!,
            initialQuantity = this[INVENTORY_UNIT.INITIAL_QUANTITY] ?: 0L,
            quantity = quantity,
            remainingQuantity = quantity - frozenQuantity,
            unitPrice = this[INVENTORY_UNIT.UNIT_PRICE] ?: BigDecimal.ZERO,
            receivedAt = this[INVENTORY_UNIT.RECEIVED_AT]?.toInstant() ?: Instant.EPOCH,
            batchCode = this[INVENTORY_UNIT.BATCH_CODE],
            serialNumber = this[INVENTORY_UNIT.SERIAL_NUMBER],
        )
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
}
