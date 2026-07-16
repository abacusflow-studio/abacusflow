package org.abacusflow.db.tenant

import org.abacusflow.tenant.TenantPlacement
import org.springframework.data.jpa.repository.JpaRepository

interface TenantPlacementRepository : JpaRepository<TenantPlacement, Long> {
    fun findByTenantId(tenantId: Long): TenantPlacement?
}
