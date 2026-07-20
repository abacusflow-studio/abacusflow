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

    /**
     * Check if a category with the given name exists in the current tenant,
     * excluding the category with the given [excludeId].
     * Used for name-uniqueness validation on update.
     */
    @Query("select case when count(p) > 0 then true else false end from ProductCategory p where p.name = :name and p.id <> :excludeId")
    fun existsByNameExcludingId(
        name: String,
        excludeId: Long,
    ): Boolean

    /**
     * Check if any direct child references the given [parentId] in the current tenant.
     * Used for deletion protection.
     */
    @Query("select case when count(p) > 0 then true else false end from ProductCategory p where p.parent.id = :parentId")
    fun existsByParentId(parentId: Long): Boolean

    @EntityGraph(attributePaths = ["parent"])
    @Query("select p from ProductCategory p")
    fun findAllWithParent(): List<ProductCategory>
}
