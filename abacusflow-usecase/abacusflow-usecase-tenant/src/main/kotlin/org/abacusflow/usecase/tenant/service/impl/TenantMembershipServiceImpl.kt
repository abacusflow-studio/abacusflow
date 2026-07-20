package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.user.TenantRoleRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.tenant.TenantRole
import org.abacusflow.usecase.commons.security.PermissionNames
import org.abacusflow.usecase.tenant.TenantMembershipTO
import org.abacusflow.usecase.tenant.mapper.toTO
import org.abacusflow.usecase.tenant.service.TenantMembershipService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class TenantMembershipServiceImpl(
    private val tenantMembershipRepository: TenantMembershipRepository,
    private val roleRepository: TenantRoleRepository,
    private val userRepository: UserRepository,
    private val currentTenantProvider: CurrentTenantProvider,
) : TenantMembershipService {
    override fun removeMember(
        tenantId: Long,
        userId: Long,
    ) {
        val membership =
            tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)
                ?: throw NoSuchElementException("Membership not found for tenant $tenantId and user $userId")
        ensureTenantKeepsAdministrator(membership, emptySet())
        tenantMembershipRepository.delete(membership)
    }

    @Transactional(readOnly = true)
    override fun getMembershipsForUser(userId: Long): List<TenantMembershipTO> {
        return tenantMembershipRepository.findByUserId(userId).map { it.toTO(resolveUserName(it.userId)) }
    }

    @Transactional(readOnly = true)
    override fun getMembership(
        tenantId: Long,
        userId: Long,
    ): TenantMembershipTO? {
        return tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)?.toTO(resolveUserName(userId))
    }

    @Transactional(readOnly = true)
    override fun listMembers(tenantId: Long): List<TenantMembershipTO> {
        return tenantMembershipRepository.findByTenantId(tenantId).map { it.toTO(resolveUserName(it.userId)) }
    }

    override fun updateMemberRoles(
        membershipId: Long,
        roleIds: List<Long>,
    ): TenantMembershipTO {
        val tenantId = currentTenantProvider.requireTenantId()
        val membership =
            tenantMembershipRepository.findByIdAndTenantId(membershipId, tenantId)
                ?: throw NoSuchElementException("Membership $membershipId not found")

        // Resolve every role before mutating the membership so a forged role ID cannot
        // leave the managed entity partially modified before the request fails.
        val roles =
            roleIds.map { roleId ->
                roleRepository.findById(roleId)
                    .orElseThrow { NoSuchElementException("Role $roleId not found") }
            }

        ensureTenantKeepsAdministrator(membership, roles.toSet())

        // Clear existing roles and add new ones
        membership.tenantRoles.forEach { membership.removeRole(it) }
        roles.forEach(membership::addRole)

        val saved = tenantMembershipRepository.save(membership)
        return saved.toTO(resolveUserName(saved.userId))
    }

    private fun resolveUserName(userId: Long): String {
        return userRepository.findById(userId)
            .map { it.nick ?: it.name }
            .orElse("Unknown User")
    }

    private fun ensureTenantKeepsAdministrator(
        target: org.abacusflow.tenant.TenantMembership,
        replacementTenantRoles: Set<TenantRole>,
    ) {
        if (target.status != MembershipStatus.ACTIVE || !hasAdministrationAuthority(target.tenantRoles)) return
        if (hasAdministrationAuthority(replacementTenantRoles)) return

        val anotherAdministratorExists =
            tenantMembershipRepository.findByTenantId(target.tenantId)
                .asSequence()
                .filter { it.id != target.id && it.status == MembershipStatus.ACTIVE }
                .any { hasAdministrationAuthority(it.tenantRoles) }
        require(anotherAdministratorExists) { "An active tenant must retain at least one effective administrator" }
    }

    private fun hasAdministrationAuthority(tenantRoles: Set<TenantRole>): Boolean {
        val permissions = tenantRoles.flatMap { role -> role.permissions.map { it.name } }.toSet()
        return permissions.containsAll(REQUIRED_ADMIN_PERMISSIONS)
    }

    private companion object {
        val REQUIRED_ADMIN_PERMISSIONS =
            setOf(
                PermissionNames.Tenant.MEMBER_CREATE,
                PermissionNames.Tenant.MEMBER_REMOVE,
                PermissionNames.Tenant.ROLE_MANAGE,
            )
    }
}
