package org.abacusflow.db.tenant

import org.abacusflow.tenant.TenantInvitation
import org.springframework.data.jpa.repository.JpaRepository

interface TenantInvitationRepository : JpaRepository<TenantInvitation, Long> {
    fun findByToken(token: String): TenantInvitation?
    fun findByTenantIdAndEmail(tenantId: Long, email: String): TenantInvitation?
    fun findAllByTenantId(tenantId: Long): List<TenantInvitation>
}
