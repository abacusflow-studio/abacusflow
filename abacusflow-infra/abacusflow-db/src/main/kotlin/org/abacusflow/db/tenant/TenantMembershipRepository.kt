package org.abacusflow.db.tenant

import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.tenant.TenantMembership
import org.springframework.data.jpa.repository.JpaRepository

interface TenantMembershipRepository : JpaRepository<TenantMembership, Long> {
    fun findByUserId(userId: Long): List<TenantMembership>

    fun findByIdAndTenantId(
        id: Long,
        tenantId: Long,
    ): TenantMembership?

    fun findByTenantIdAndUserId(
        tenantId: Long,
        userId: Long,
    ): TenantMembership?

    fun findByUserIdAndStatus(
        userId: Long,
        status: MembershipStatus,
    ): List<TenantMembership>

    fun existsByTenantIdAndUserId(
        tenantId: Long,
        userId: Long,
    ): Boolean

    fun findByTenantId(tenantId: Long): List<TenantMembership>
}
