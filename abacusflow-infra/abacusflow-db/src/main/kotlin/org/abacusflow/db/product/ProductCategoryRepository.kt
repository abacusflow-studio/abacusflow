package org.abacusflow.db.product

import org.abacusflow.product.ProductCategory
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

/**
 * 产品分类 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 */
@Repository
interface ProductCategoryRepository : JpaRepository<ProductCategory, Long> {
    fun existsByName(name: String): Boolean

    @EntityGraph(attributePaths = ["parent"])
    @Query("select p from ProductCategory p")
    fun findAllWithParent(): List<ProductCategory>
}
