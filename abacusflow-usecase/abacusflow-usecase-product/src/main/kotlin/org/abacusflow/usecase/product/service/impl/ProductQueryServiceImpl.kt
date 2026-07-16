package org.abacusflow.usecase.product.service.impl

import org.abacusflow.db.product.ProductRepository
import org.abacusflow.generated.jooq.Tables.PRODUCT
import org.abacusflow.generated.jooq.Tables.PRODUCT_CATEGORY
import org.abacusflow.generated.jooq.enums.ProductTypeDbEnum
import org.abacusflow.generated.jooq.tables.records.ProductRecord
import org.abacusflow.usecase.product.BasicProductTO
import org.abacusflow.usecase.product.ProductTO
import org.abacusflow.usecase.product.mapper.toTO
import org.abacusflow.usecase.product.service.ProductQueryService
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class ProductQueryServiceImpl(
    private val productRepository: ProductRepository,
    private val jooqDsl: DSLContext,
) : ProductQueryService {
    override fun getProduct(id: Long): ProductTO {
        return productRepository
            .findById(id)
            .map { it.toTO() }
            .orElseThrow { NoSuchElementException("Product not found with id: $id") }
    }

    override fun getProduct(name: String): ProductTO {
        return productRepository
            .findByName(name)
            .firstOrNull()
            ?.toTO()
            ?: throw NoSuchElementException("Product not found")
    }

    override fun listBasicProductsPage(
        pageable: Pageable,
        name: String?,
        type: String?,
        enabled: Boolean?,
        categoryId: Long?,
    ): Page<BasicProductTO> {
        val conditions =
            buildList<Condition> {
                name?.takeIf { it.isNotBlank() }?.let {
                    add(PRODUCT.NAME.containsIgnoreCase(it))
                }

                type?.takeIf { it.isNotBlank() }?.let {
                    val typeEnum =
                        when (it.uppercase()) {
                            "MATERIAL" -> ProductTypeDbEnum.MATERIAL
                            "ASSET" -> ProductTypeDbEnum.ASSET
                            else -> throw IllegalArgumentException("Product type not supported: $it")
                        }
                    add(PRODUCT.TYPE.eq(typeEnum))
                }

                enabled?.let {
                    add(PRODUCT.ENABLED.eq(it))
                }

                categoryId?.let { catId ->
                    val categoryIds = findAllChildrenCategories(catId)
                    if (categoryIds.isNotEmpty()) {
                        add(PRODUCT.CATEGORY_ID.`in`(categoryIds))
                    } else {
                        add(DSL.noCondition())
                    }
                }
            }

        // 1. 查询总数
        val total =
            jooqDsl
                .selectCount()
                .from(PRODUCT)
                .where(conditions)
                .fetchOne(0, Long::class.java) ?: 0L

        // 2. 查询分页数据（只查需要字段）
        val records =
            jooqDsl
                .select(
                    PRODUCT.ID,
                    PRODUCT.NAME,
                    PRODUCT.TYPE,
                    PRODUCT.BARCODE,
                    PRODUCT.ENABLED,
                    PRODUCT.SPECIFICATION,
                    PRODUCT.UNIT,
                    PRODUCT.NOTE,
                    PRODUCT.CATEGORY_ID,
                    PRODUCT_CATEGORY.NAME,
                )
                .from(PRODUCT)
                .leftJoin(PRODUCT_CATEGORY)
                .on(PRODUCT.CATEGORY_ID.eq(PRODUCT_CATEGORY.ID))
                .where(conditions)
                .orderBy(PRODUCT.CREATED_AT.desc())
                .offset(pageable.offset)
                .limit(pageable.pageSize)
                .fetch()
                .map {
                    BasicProductTO(
                        id = it[PRODUCT.ID]!!,
                        name = it[PRODUCT.NAME],
                        barcode = it[PRODUCT.BARCODE],
                        specification = it[PRODUCT.SPECIFICATION],
                        type = it[PRODUCT.TYPE].name,
                        categoryName = it[PRODUCT_CATEGORY.NAME],
                        unit = it[PRODUCT.UNIT].name,
                        note = it[PRODUCT.NOTE],
                        enabled = it[PRODUCT.ENABLED]!!,
                    )
                }

        return PageImpl(records, pageable, total)
    }

    override fun listProducts(): List<ProductTO> {
        return jooqDsl
            .selectFrom(PRODUCT)
            .where(DSL.noCondition())
            .orderBy(PRODUCT.CREATED_AT.desc())
            .fetch()
            .map { it.toTO() }
    }

    fun ProductRecord.toTO(): ProductTO {
        return ProductTO(
            id = this.id,
            type = this.type.literal,
            name = this.name,
            barcode = this.barcode,
            specification = this.specification,
            unit = this.unit.literal,
            categoryId = this.categoryId,
            note = this.note,
            enabled = this.enabled,
            createdAt = this.createdAt.toInstant(),
            updatedAt = this.updatedAt.toInstant(),
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
