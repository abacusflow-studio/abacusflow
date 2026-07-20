package org.abacusflow.db.tenant

import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantStatus
import org.springframework.data.jpa.repository.JpaRepository

interface TenantRepository : JpaRepository<Tenant, Long> {
    fun findByName(name: String): Tenant?

    fun existsByName(name: String): Boolean

    fun findByIdAndStatus(
        id: Long,
        status: TenantStatus,
    ): Tenant?

    fun findByStatus(status: TenantStatus): List<Tenant>
}
