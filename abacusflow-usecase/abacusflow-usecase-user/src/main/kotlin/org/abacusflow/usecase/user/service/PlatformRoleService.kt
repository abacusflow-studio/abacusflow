package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.user.PlatformRoleAssignmentTO
import org.abacusflow.usecase.user.PlatformRoleInputTO
import org.abacusflow.usecase.user.PlatformRoleTO
import org.springframework.security.access.prepost.PreAuthorize

interface PlatformRoleService {
    @PreAuthorize(RequiredAuthority.PLATFORM_ROLE_READ)
    fun listRoles(): List<PlatformRoleTO>

    @PreAuthorize(RequiredAuthority.PLATFORM_ROLE_READ)
    fun listAssignments(roleId: Long): List<PlatformRoleAssignmentTO>

    @PreAuthorize(RequiredAuthority.PLATFORM_ROLE_MANAGE)
    fun createRole(input: PlatformRoleInputTO): PlatformRoleTO

    @PreAuthorize(RequiredAuthority.PLATFORM_ROLE_MANAGE)
    fun updateRole(
        roleId: Long,
        label: String?,
        permissionIds: List<Long>,
    ): PlatformRoleTO

    @PreAuthorize(RequiredAuthority.PLATFORM_ROLE_MANAGE)
    fun deleteRole(roleId: Long)

    @PreAuthorize(RequiredAuthority.PLATFORM_ROLE_MANAGE)
    fun assignRole(
        userId: Long,
        roleId: Long,
    ): PlatformRoleAssignmentTO

    @PreAuthorize(RequiredAuthority.PLATFORM_ROLE_MANAGE)
    fun removeRole(
        userId: Long,
        roleId: Long,
    )
}
