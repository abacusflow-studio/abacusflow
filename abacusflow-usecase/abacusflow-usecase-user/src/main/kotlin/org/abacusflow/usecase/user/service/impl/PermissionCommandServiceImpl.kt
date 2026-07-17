package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.RoleRepository
import org.abacusflow.usecase.user.PermissionTO
import org.abacusflow.usecase.user.mapper.toTO
import org.abacusflow.usecase.user.service.PermissionCommandService
import org.abacusflow.user.Permission
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class PermissionCommandServiceImpl(
    private val permissionRepository: PermissionRepository,
    private val roleRepository: RoleRepository,
) : PermissionCommandService {

    override fun createPermission(name: String, label: String, description: String): PermissionTO {
        require(permissionRepository.findByName(name) == null) {
            "Permission '$name' already exists"
        }
        val permission = Permission(
            name = name,
            label = label,
            description = description,
        )
        return permissionRepository.save(permission).toTO()
    }

    override fun updatePermission(id: Long, label: String?, description: String?): PermissionTO {
        val permission = permissionRepository.findById(id)
            .orElseThrow { NoSuchElementException("Permission $id not found") }

        permission.updateProfile(label = label, description = description)

        return permissionRepository.save(permission).toTO()
    }

    override fun deletePermission(id: Long) {
        val permission = permissionRepository.findById(id)
            .orElseThrow { NoSuchElementException("Permission $id not found") }

        // Check if any role uses this permission
        val rolesUsingPermission = roleRepository.findAll().filter { role ->
            role.permissions.any { it.id == id }
        }
        require(rolesUsingPermission.isEmpty()) {
            "Cannot delete permission '${permission.name}' because it is used by ${rolesUsingPermission.size} role(s): ${rolesUsingPermission.map { it.name }}"
        }

        permissionRepository.delete(permission)
    }
}
