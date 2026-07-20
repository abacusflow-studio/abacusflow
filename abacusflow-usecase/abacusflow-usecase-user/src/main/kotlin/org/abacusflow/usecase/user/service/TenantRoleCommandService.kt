package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.user.CreateTenantRoleInputTO
import org.abacusflow.usecase.user.TenantRoleTO
import org.abacusflow.usecase.user.UpdateTenantRoleInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantRoleCommandService {
    @PreAuthorize(RequiredAuthority.TENANT_ROLE_MANAGE)
    fun createRole(input: CreateTenantRoleInputTO): TenantRoleTO

    @PreAuthorize(RequiredAuthority.TENANT_ROLE_MANAGE)
    fun updateRole(
        roleId: Long,
        input: UpdateTenantRoleInputTO,
    ): TenantRoleTO

    @PreAuthorize(RequiredAuthority.TENANT_ROLE_MANAGE)
    fun deleteRole(roleId: Long)
}
