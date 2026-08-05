package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.tenant.TenantMembershipTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantMembershipService {
    @PreAuthorize(RequiredAuthority.TENANT_MEMBER_REMOVE)
    fun removeMember(
        tenantId: Long,
        userId: Long,
    )

    fun getMembershipsForUser(userId: Long): List<TenantMembershipTO>

    fun getMembership(
        tenantId: Long,
        userId: Long,
    ): TenantMembershipTO?

    @PreAuthorize(RequiredAuthority.TENANT_MEMBER_READ)
    fun listMembers(tenantId: Long): List<TenantMembershipTO>

    @PreAuthorize(RequiredAuthority.TENANT_MEMBER_UPDATE)
    fun updateMemberRoles(
        membershipId: Long,
        roleIds: List<Long>,
    ): TenantMembershipTO
}
