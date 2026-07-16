package org.abacusflow.db.product

import org.abacusflow.product.Product
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 产品 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理，
 * 所有查询方法自动追加 WHERE tenant_id = :tenantId 条件。
 */
@Repository
interface ProductRepository : JpaRepository<Product, Long> {
    fun findByCategoryId(categoryId: Long): List<Product>

    fun countProductByCategoryId(id: Long): Int

    fun existsByBarcode(barcode: String): Boolean

    fun findByName(name: String): List<Product>
}
