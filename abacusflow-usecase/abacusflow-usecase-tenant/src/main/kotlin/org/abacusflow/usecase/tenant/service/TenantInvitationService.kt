package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.tenant.TenantInvitationTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantInvitationService {

    /**
     * 邀请用户加入当前租户。
     * 通过邮箱指定被邀请人，系统生成唯一 token。
     * 需要当前租户的 tenant:member:create 权限。
     */
    @PreAuthorize("hasAuthority('tenant:member:create')")
    fun createInvitation(tenantId: Long, email: String, roleIds: List<Long>, invitedByUserId: Long): TenantInvitationTO

    /**
     * 列出当前租户的所有邀请。
     * 需要 tenant:member:read 权限。
     */
    @PreAuthorize("hasAuthority('tenant:member:read')")
    fun listInvitations(tenantId: Long): List<TenantInvitationTO>

    /**
     * 通过邀请 token 接受邀请。
     * 不需要特殊权限——任何已认证用户持有有效 token 即可接受。
     * 接受后自动创建 TenantMembership 并关联邀请时指定的角色。
     * 同时通过邮箱匹配自动关联已有用户。
     */
    fun acceptInvitation(token: String, userId: Long): TenantInvitationTO

    /**
     * 取消（撤销）邀请。
     * 需要 tenant:member:create 权限（只有能邀请的人才能取消邀请）。
     */
    @PreAuthorize("hasAuthority('tenant:member:create')")
    fun cancelInvitation(invitationId: Long): TenantInvitationTO
}
