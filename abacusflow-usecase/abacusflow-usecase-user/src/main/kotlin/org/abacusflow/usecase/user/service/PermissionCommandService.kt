package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.PermissionTO

interface PermissionCommandService {
    fun createPermission(name: String, label: String, description: String): PermissionTO
    fun updatePermission(id: Long, label: String?, description: String?): PermissionTO
    fun deletePermission(id: Long)
}
