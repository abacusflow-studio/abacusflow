package org.abacusflow.db.transaction

import org.abacusflow.transaction.PurchaseOrderItem
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 采购单明细 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 */
@Repository
interface PurchaseOrderItemRepository : JpaRepository<PurchaseOrderItem, Long> {
    /** 按 productId 统计采购单明细数量（Filter 自动追加 tenant_id 条件） */
    fun countByProductId(productId: Long): Long
}
