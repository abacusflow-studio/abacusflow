package org.abacusflow.db.transaction

import org.abacusflow.transaction.PurchaseOrder
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 采购单 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 */
@Repository
interface PurchaseOrderRepository : JpaRepository<PurchaseOrder, Long> {
    /** 按供应商 ID 查询采购单（Filter 自动追加 tenant_id 条件） */
    fun findBySupplierId(supplierId: Long): List<PurchaseOrder>

    /** 按状态和日期查询采购单（Filter 自动追加 tenant_id 条件） */
    fun findByStatusAndOrderDateBefore(status: org.abacusflow.transaction.OrderStatus, date: java.time.LocalDate): List<PurchaseOrder>
}
