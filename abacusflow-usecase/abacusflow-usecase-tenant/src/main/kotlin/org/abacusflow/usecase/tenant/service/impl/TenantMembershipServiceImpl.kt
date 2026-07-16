package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.user.RoleRepository
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.usecase.tenant.TenantMembershipTO
import org.abacusflow.usecase.tenant.mapper.toTO
import org.abacusflow.usecase.tenant.service.TenantMembershipService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class TenantMembershipServiceImpl(
    private val tenantMembershipRepository: TenantMembershipRepository,
    private val roleRepository: RoleRepository,
) : TenantMembershipService {

    override fun addMember(tenantId: Long, userId: Long, roleIds: List<Long>): TenantMembershipTO {
        require(!tenantMembershipRepository.existsByTenantIdAndUserId(tenantId, userId)) {
            "User $userId is already a member of tenant $tenantId"
        }

        val membership = TenantMembership(tenantId = tenantId, userId = userId)
        roleIds.forEach { roleId ->
            val role = roleRepository.findById(roleId)
                .orElseThrow { NoSuchElementException("Role $roleId not found") }
            membership.addRole(role)
        }
        return tenantMembershipRepository.save(membership).toTO()
    }

    override fun removeMember(tenantId: Long, userId: Long) {
        val membership = tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)
            ?: throw NoSuchElementException("Membership not found for tenant $tenantId and user $userId")
        tenantMembershipRepository.delete(membership)
    }

    @Transactional(readOnly = true)
    override fun getMembershipsForUser(userId: Long): List<TenantMembershipTO> {
        return tenantMembershipRepository.findByUserId(userId).map { it.toTO() }
    }

    @Transactional(readOnly = true)
    override fun getMembership(tenantId: Long, userId: Long): TenantMembershipTO? {
        return tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)?.toTO()
    }
}
