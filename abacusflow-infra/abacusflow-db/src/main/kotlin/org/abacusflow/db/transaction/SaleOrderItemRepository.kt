package org.abacusflow.db.transaction

import org.abacusflow.transaction.SaleOrderItem
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 销售单明细 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 */
@Repository
interface SaleOrderItemRepository : JpaRepository<SaleOrderItem, Long> {
    /** 按库存单元 ID 列表统计销售单明细数量（Filter 自动追加 tenant_id 条件） */
    fun countByInventoryUnitIdIn(ids: List<Long>): Long
}
