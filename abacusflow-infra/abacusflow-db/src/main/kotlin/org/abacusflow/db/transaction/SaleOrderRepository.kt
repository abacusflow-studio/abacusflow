package org.abacusflow.db.transaction

import org.abacusflow.transaction.SaleOrder
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 销售单 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 */
@Repository
interface SaleOrderRepository : JpaRepository<SaleOrder, Long> {
    /** 按客户 ID 查询销售单（Filter 自动追加 tenant_id 条件） */
    fun findByCustomerId(customerId: Long): List<SaleOrder>

    /** 按状态和日期查询销售单（Filter 自动追加 tenant_id 条件） */
    fun findByStatusAndOrderDateBefore(
        status: org.abacusflow.transaction.OrderStatus,
        date: java.time.LocalDate,
    ): List<SaleOrder>
}
