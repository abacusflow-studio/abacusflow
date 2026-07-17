package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.PermissionTO
import org.abacusflow.usecase.user.RoleTO
import org.springframework.security.access.prepost.PreAuthorize

interface RoleQueryService {
    @PreAuthorize("hasAuthority('role:read')")
    fun listRoles(): List<RoleTO>

    @PreAuthorize("hasAuthority('role:read')")
    fun getRole(roleId: Long): RoleTO

    @PreAuthorize("hasAuthority('role:read')")
    fun listPermissions(): List<PermissionTO>
}
