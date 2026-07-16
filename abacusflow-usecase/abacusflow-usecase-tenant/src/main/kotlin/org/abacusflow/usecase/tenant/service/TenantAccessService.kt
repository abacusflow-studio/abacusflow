package org.abacusflow.usecase.tenant.service

import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.tenant.MembershipStatus
import org.springframework.stereotype.Service

@Service
class TenantAccessService(
    private val tenantMembershipRepository: TenantMembershipRepository,
) {
    fun userHasAccessToTenant(userId: Long, tenantId: Long): Boolean {
        val membership = tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)
            ?: return false
        return membership.status == MembershipStatus.ACTIVE
    }
}
