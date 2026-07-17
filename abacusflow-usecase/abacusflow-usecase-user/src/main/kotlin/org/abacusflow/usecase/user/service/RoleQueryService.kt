package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.PermissionTO
import org.abacusflow.usecase.user.RoleTO
import org.springframework.security.access.prepost.PreAuthorize

interface RoleQueryService {
    @PreAuthorize("hasAuthority('tenant:role:read')")
    fun listRoles(): List<RoleTO>

    @PreAuthorize("hasAuthority('tenant:role:read')")
    fun getRole(roleId: Long): RoleTO

    @PreAuthorize("hasAuthority('platform:permission:read')")
    fun listPermissions(): List<PermissionTO>
}
