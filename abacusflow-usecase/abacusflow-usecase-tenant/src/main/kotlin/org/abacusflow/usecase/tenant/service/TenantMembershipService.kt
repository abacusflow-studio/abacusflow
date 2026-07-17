package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.tenant.TenantMembershipTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantMembershipService {
    @PreAuthorize("hasAuthority('tenant:member:create')")
    fun addMember(tenantId: Long, userId: Long, roleIds: List<Long>): TenantMembershipTO

    @PreAuthorize("hasAuthority('tenant:member:remove')")
    fun removeMember(tenantId: Long, userId: Long)

    fun getMembershipsForUser(userId: Long): List<TenantMembershipTO>

    fun getMembership(tenantId: Long, userId: Long): TenantMembershipTO?

    @PreAuthorize("hasAuthority('tenant:member:read')")
    fun listMembers(tenantId: Long): List<TenantMembershipTO>

    @PreAuthorize("hasAuthority('tenant:member:update')")
    fun updateMemberRoles(membershipId: Long, roleIds: List<Long>): TenantMembershipTO
}
