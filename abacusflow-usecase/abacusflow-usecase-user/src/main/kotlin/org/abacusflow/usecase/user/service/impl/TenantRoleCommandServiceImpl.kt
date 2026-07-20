package org.abacusflow.usecase.user.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.TenantRoleRepository
import org.abacusflow.usecase.user.CreateTenantRoleInputTO
import org.abacusflow.usecase.user.TenantRoleTO
import org.abacusflow.usecase.user.UpdateTenantRoleInputTO
import org.abacusflow.usecase.user.mapper.toTO
import org.abacusflow.usecase.user.service.TenantRoleCommandService
import org.abacusflow.user.Permission
import org.abacusflow.user.PermissionScope
import org.abacusflow.tenant.TenantRole
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class TenantRoleCommandServiceImpl(
    private val roleRepository: TenantRoleRepository,
    private val permissionRepository: PermissionRepository,
    private val tenantMembershipRepository: TenantMembershipRepository,
    private val currentTenantProvider: CurrentTenantProvider,
) : TenantRoleCommandService {
    override fun createRole(input: CreateTenantRoleInputTO): TenantRoleTO {
        val tenantId = currentTenantProvider.requireTenantId()

        // Check for duplicate name within the tenant
        require(roleRepository.findByName(input.name) == null) {
            "Role '${input.name}' already exists in this tenant"
        }

        val permissions = resolveTenantPermissions(input.permissionIds)

        val tenantRole =
            TenantRole(
                name = input.name,
                tenantId = tenantId,
            )
        if (input.label != null) {
            tenantRole.updateProfile(input.label)
        }

        permissions.forEach(tenantRole::addPermission)

        return roleRepository.save(tenantRole).toTO()
    }

    override fun updateRole(
        roleId: Long,
        input: UpdateTenantRoleInputTO,
    ): TenantRoleTO {
        currentTenantProvider.requireTenantId()
        val role =
            roleRepository.findById(roleId)
                .orElseThrow { NoSuchElementException("Role $roleId not found") }

        val permissions = if (input.permissionIds.isEmpty()) null else resolveTenantPermissions(input.permissionIds)

        input.label?.let { role.updateProfile(it) }
        if (permissions != null) {
            role.replacePermissions(permissions)
        }

        return roleRepository.save(role).toTO()
    }

    override fun deleteRole(roleId: Long) {
        val tenantId = currentTenantProvider.requireTenantId()
        val role =
            roleRepository.findById(roleId)
                .orElseThrow { NoSuchElementException("Role $roleId not found") }

        // Check if any membership uses this role
        val memberships = tenantMembershipRepository.findByTenantId(tenantId)
        val usedByMembers =
            memberships.filter { membership ->
                membership.tenantRoles.any { it.id == roleId }
            }

        require(usedByMembers.isEmpty()) {
            "Cannot delete role '${role.name}' because it is assigned to ${usedByMembers.size} member(s)"
        }

        roleRepository.delete(role)
    }

    private fun resolveTenantPermissions(permissionIds: List<Long>): List<Permission> {
        if (permissionIds.isEmpty()) return emptyList()

        val requestedIds = permissionIds.toSet()
        val permissions = permissionRepository.findAllById(requestedIds)
        val foundIds = permissions.mapTo(mutableSetOf()) { it.id }
        val missingIds = requestedIds - foundIds
        require(missingIds.isEmpty()) { "Permissions not found: ${missingIds.sorted()}" }

        val platformPermissions = permissions.filter { it.scope == PermissionScope.PLATFORM }
        require(platformPermissions.isEmpty()) {
            "Platform permissions cannot be assigned to tenant roles: ${platformPermissions.map { it.name }.sorted()}"
        }

        return permissions
    }
}
