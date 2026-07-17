package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.CreateRoleInputTO
import org.abacusflow.usecase.user.RoleTO
import org.abacusflow.usecase.user.UpdateRoleInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface RoleCommandService {
    @PreAuthorize("hasAuthority('role:manage')")
    fun createRole(input: CreateRoleInputTO): RoleTO

    @PreAuthorize("hasAuthority('role:manage')")
    fun updateRole(roleId: Long, input: UpdateRoleInputTO): RoleTO

    @PreAuthorize("hasAuthority('role:manage')")
    fun deleteRole(roleId: Long)
}
