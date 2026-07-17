package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.PermissionTO
import org.springframework.security.access.prepost.PreAuthorize

interface PermissionCommandService {
    @PreAuthorize("hasAuthority('platform:permission:manage')")
    fun createPermission(name: String, label: String, description: String): PermissionTO

    @PreAuthorize("hasAuthority('platform:permission:manage')")
    fun updatePermission(id: Long, label: String?, description: String?): PermissionTO

    @PreAuthorize("hasAuthority('platform:permission:manage')")
    fun deletePermission(id: Long)
}
