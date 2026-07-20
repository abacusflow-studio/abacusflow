package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.user.PermissionTO
import org.abacusflow.usecase.user.TenantRoleTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantRoleQueryService {
    @PreAuthorize(RequiredAuthority.TENANT_ROLE_READ)
    fun listRoles(): List<TenantRoleTO>

    @PreAuthorize(RequiredAuthority.TENANT_ROLE_READ)
    fun getRole(roleId: Long): TenantRoleTO

    @PreAuthorize(RequiredAuthority.TENANT_ROLE_READ)
    fun listTenantAssignablePermissions(): List<PermissionTO>

    @PreAuthorize(RequiredAuthority.PLATFORM_PERMISSION_READ)
    fun listPermissions(): List<PermissionTO>
}
