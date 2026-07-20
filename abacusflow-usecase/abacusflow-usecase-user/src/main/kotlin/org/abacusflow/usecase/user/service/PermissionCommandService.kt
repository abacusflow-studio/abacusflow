package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.user.PermissionTO
import org.springframework.security.access.prepost.PreAuthorize

interface PermissionCommandService {
    /**
     * Update the label and/or description of an existing permission definition.
     * Permission name and scope are immutable deployed contracts — they cannot be changed at runtime.
     */
    @PreAuthorize(RequiredAuthority.PLATFORM_PERMISSION_MANAGE)
    fun updatePermission(
        id: Long,
        label: String?,
        description: String?,
    ): PermissionTO
}
