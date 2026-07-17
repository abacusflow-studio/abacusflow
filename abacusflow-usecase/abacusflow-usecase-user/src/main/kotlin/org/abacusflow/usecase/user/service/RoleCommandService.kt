package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.CreateRoleInputTO
import org.abacusflow.usecase.user.RoleTO
import org.abacusflow.usecase.user.UpdateRoleInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface RoleCommandService {
    @PreAuthorize("hasAuthority('tenant:role:manage')")
    fun createRole(input: CreateRoleInputTO): RoleTO

    @PreAuthorize("hasAuthority('tenant:role:manage')")
    fun updateRole(roleId: Long, input: UpdateRoleInputTO): RoleTO

    @PreAuthorize("hasAuthority('tenant:role:manage')")
    fun deleteRole(roleId: Long)
}
