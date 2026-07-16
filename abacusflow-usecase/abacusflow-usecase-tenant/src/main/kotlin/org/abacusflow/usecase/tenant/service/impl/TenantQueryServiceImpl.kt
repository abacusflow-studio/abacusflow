package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.usecase.tenant.TenantSummaryTO
import org.abacusflow.usecase.tenant.TenantTO
import org.abacusflow.usecase.tenant.mapper.toSummaryTO
import org.abacusflow.usecase.tenant.mapper.toTO
import org.abacusflow.usecase.tenant.service.TenantQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class TenantQueryServiceImpl(
    private val tenantRepository: TenantRepository,
    private val tenantMembershipRepository: TenantMembershipRepository,
) : TenantQueryService {

    override fun getTenant(tenantId: Long): TenantTO {
        val tenant = tenantRepository.findById(tenantId)
            .orElseThrow { NoSuchElementException("Tenant $tenantId not found") }
        return tenant.toTO()
    }

    override fun listTenantsForUser(userId: Long): List<TenantSummaryTO> {
        val memberships = tenantMembershipRepository.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE)
        return memberships.mapNotNull { membership ->
            val tenant = tenantRepository.findById(membership.tenantId).orElse(null)
            tenant?.let { membership.toSummaryTO(it) }
        }
    }
}
