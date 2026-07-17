package org.abacusflow.usecase.user.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.RoleRepository
import org.abacusflow.usecase.user.CreateRoleInputTO
import org.abacusflow.usecase.user.RoleTO
import org.abacusflow.usecase.user.UpdateRoleInputTO
import org.abacusflow.usecase.user.mapper.toTO
import org.abacusflow.usecase.user.service.RoleCommandService
import org.abacusflow.user.Role
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class RoleCommandServiceImpl(
    private val roleRepository: RoleRepository,
    private val permissionRepository: PermissionRepository,
    private val tenantMembershipRepository: TenantMembershipRepository,
    private val currentTenantProvider: CurrentTenantProvider,
) : RoleCommandService {

    override fun createRole(input: CreateRoleInputTO): RoleTO {
        val tenantId = currentTenantProvider.requireTenantId()

        // Check for duplicate name within the tenant
        require(roleRepository.findByNameAndTenantId(input.name, tenantId) == null) {
            "Role '${input.name}' already exists in this tenant"
        }

        val role = Role(
            name = input.name,
            tenantId = tenantId,
        )
        if (input.label != null) {
            role.updateProfile(input.label)
        }

        // Attach permissions
        if (input.permissionIds.isNotEmpty()) {
            val permissions = permissionRepository.findAllById(input.permissionIds)
            permissions.forEach { role.addPermission(it) }
        }

        return roleRepository.save(role).toTO()
    }

    override fun updateRole(roleId: Long, input: UpdateRoleInputTO): RoleTO {
        val role = roleRepository.findById(roleId)
            .orElseThrow { NoSuchElementException("Role $roleId not found") }

        input.label?.let { role.updateProfile(it) }

        // Replace permissions if provided
        if (input.permissionIds.isNotEmpty()) {
            // Clear existing permissions
            role.permissions.clear()
            // Add new permissions
            val permissions = permissionRepository.findAllById(input.permissionIds)
            permissions.forEach { role.addPermission(it) }
        }

        return roleRepository.save(role).toTO()
    }

    override fun deleteRole(roleId: Long) {
        val role = roleRepository.findById(roleId)
            .orElseThrow { NoSuchElementException("Role $roleId not found") }

        // Check if any membership uses this role
        val tenantId = currentTenantProvider.requireTenantId()
        val memberships = tenantMembershipRepository.findByTenantId(tenantId)
        val usedByMembers = memberships.filter { membership ->
            membership.roles.any { it.id == roleId }
        }

        require(usedByMembers.isEmpty()) {
            "Cannot delete role '${role.name}' because it is assigned to ${usedByMembers.size} member(s)"
        }

        roleRepository.delete(role)
    }
}
