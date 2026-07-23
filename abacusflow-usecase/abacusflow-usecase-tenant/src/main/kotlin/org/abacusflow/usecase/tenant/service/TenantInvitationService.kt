package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.tenant.TenantInvitationTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantInvitationService {
    /**
     * 邀请用户加入当前租户。
     * 通过邮箱指定被邀请人，系统生成唯一 token。
     * 需要当前租户的 tenant:member:create 权限。
     */
    @PreAuthorize(RequiredAuthority.TENANT_MEMBER_CREATE)
    fun createInvitation(
        tenantId: Long,
        email: String,
        roleIds: List<Long>,
        invitedByUserId: Long,
    ): TenantInvitationTO

    /**
     * 列出当前租户的所有邀请。
     * 需要 tenant:member:read 权限。
     */
    @PreAuthorize(RequiredAuthority.TENANT_MEMBER_READ)
    fun listInvitations(tenantId: Long): List<TenantInvitationTO>

    /** 列出与当前已验证邮箱匹配的未过期待处理邀请，不暴露 token。 */
    fun listMyPendingInvitations(
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ): List<TenantInvitationTO>

    /**
     * 通过邀请 token 接受邀请。
     * 不需要特殊权限——任何已认证用户持有有效 token 即可接受。
     * 接受后自动创建 TenantMembership 并关联邀请时指定的角色。
     * 同时通过邮箱匹配自动关联已有用户。
     */
    fun acceptInvitation(
        token: String,
        userId: Long,
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ): TenantInvitationTO

    /** 当前登录用户按邀请 ID 接受与其已验证邮箱匹配的邀请。 */
    fun acceptInvitationById(
        invitationId: Long,
        userId: Long,
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ): TenantInvitationTO

    /** 当前登录用户按邀请 ID 拒绝与其已验证邮箱匹配的邀请。 */
    fun declineInvitation(
        invitationId: Long,
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ): TenantInvitationTO

    /**
     * 取消（撤销）邀请。
     * 需要 tenant:member:create 权限（只有能邀请的人才能取消邀请）。
     */
    @PreAuthorize(RequiredAuthority.TENANT_MEMBER_CREATE)
    fun cancelInvitation(invitationId: Long): TenantInvitationTO

    /** 平台管理员为仍待激活的租户撤销旧首邀并生成一个新 token。 */
    @PreAuthorize(RequiredAuthority.PLATFORM_TENANT_UPDATE)
    fun reissueInitialInvitation(
        tenantId: Long,
        email: String,
        invitedByUserId: Long,
    ): TenantInvitationTO
}
