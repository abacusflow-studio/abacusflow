package org.abacusflow.db.depot

import org.abacusflow.depot.Depot
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 仓库 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 */
@Repository
interface DepotRepository : JpaRepository<Depot, Long> {
    /** 按名称判断仓库是否存在（Filter 自动追加 tenant_id 条件） */
    fun existsByName(name: String): Boolean
}
