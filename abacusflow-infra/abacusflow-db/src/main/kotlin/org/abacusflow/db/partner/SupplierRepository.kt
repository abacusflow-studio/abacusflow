package org.abacusflow.db.partner

import org.abacusflow.partner.Supplier
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 供应商 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 */
@Repository
interface SupplierRepository : JpaRepository<Supplier, Long> {
    /** 按名称查询供应商（Filter 自动追加 tenant_id 条件） */
    fun findByName(name: String): Supplier?

    /** 按名称判断供应商是否存在（Filter 自动追加 tenant_id 条件） */
    fun existsByName(name: String): Boolean
}
