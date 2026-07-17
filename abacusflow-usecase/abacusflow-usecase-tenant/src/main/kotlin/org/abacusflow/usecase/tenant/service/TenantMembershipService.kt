package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.tenant.TenantMembershipTO

interface TenantMembershipService {
    fun addMember(tenantId: Long, userId: Long, roleIds: List<Long>): TenantMembershipTO
    fun removeMember(tenantId: Long, userId: Long)
    fun getMembershipsForUser(userId: Long): List<TenantMembershipTO>
    fun getMembership(tenantId: Long, userId: Long): TenantMembershipTO?
    fun listMembers(tenantId: Long): List<TenantMembershipTO>
    fun updateMemberRoles(membershipId: Long, roleIds: List<Long>): TenantMembershipTO
}
