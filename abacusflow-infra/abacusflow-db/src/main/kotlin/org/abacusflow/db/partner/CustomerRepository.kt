package org.abacusflow.db.partner

import org.abacusflow.partner.Customer
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 客户 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 */
@Repository
interface CustomerRepository : JpaRepository<Customer, Long> {
    /** 按名称查询客户（Filter 自动追加 tenant_id 条件） */
    fun findByName(name: String): Customer?

    /** 按名称判断客户是否存在（Filter 自动追加 tenant_id 条件） */
    fun existsByName(name: String): Boolean
}
