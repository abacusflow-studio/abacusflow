package org.abacusflow.db.inventory

import jakarta.persistence.LockModeType
import org.abacusflow.inventory.Inventory
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * 库存 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 */
@Repository
interface InventoryRepository : JpaRepository<Inventory, Long> {
    /** 按产品 ID 查询库存（Filter 自动追加 tenant_id 条件） */
    fun findByProductId(productId: Long): Inventory?

    /**
     * 悲观锁查询库存行，用于库存扣减等高并发场景。
     *
     * Hibernate Filter 自动追加 tenant_id 条件，
     * 无需手动传入 tenantId 参数。
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.productId = :productId")
    fun findForUpdate(
        @Param("productId") productId: Long,
    ): Inventory?
}
