package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.PlatformRoleRepository
import org.abacusflow.db.user.PlatformUserRoleRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.usecase.commons.security.PermissionNames
import org.abacusflow.usecase.user.PlatformRoleAssignmentTO
import org.abacusflow.usecase.user.PlatformRoleInputTO
import org.abacusflow.usecase.user.PlatformRoleTO
import org.abacusflow.usecase.user.service.PlatformRoleService
import org.abacusflow.user.Permission
import org.abacusflow.user.PermissionScope
import org.abacusflow.user.PlatformRole
import org.abacusflow.user.PlatformUserRole
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class PlatformRoleServiceImpl(
    private val platformRoleRepository: PlatformRoleRepository,
    private val platformUserRoleRepository: PlatformUserRoleRepository,
    private val permissionRepository: PermissionRepository,
    private val userRepository: UserRepository,
) : PlatformRoleService {
    @Transactional(readOnly = true)
    override fun listRoles(): List<PlatformRoleTO> = platformRoleRepository.findAll().map { it.toTO() }

    @Transactional(readOnly = true)
    override fun listAssignments(roleId: Long): List<PlatformRoleAssignmentTO> {
        require(platformRoleRepository.existsById(roleId)) { "Platform role $roleId not found" }
        return platformUserRoleRepository.findAllByRoleId(roleId).map { it.toTO() }
    }

    override fun createRole(input: PlatformRoleInputTO): PlatformRoleTO {
        require(!platformRoleRepository.existsByName(input.name)) { "Platform role '${input.name}' already exists" }
        val permissions = resolvePlatformPermissions(input.permissionIds)
        val role = PlatformRole(input.name)
        input.label?.let(role::updateProfile)
        role.replacePermissions(permissions)
        return platformRoleRepository.save(role).toTO()
    }

    override fun updateRole(
        roleId: Long,
        label: String?,
        permissionIds: List<Long>,
    ): PlatformRoleTO {
        val role =
            platformRoleRepository.findById(roleId)
                .orElseThrow { NoSuchElementException("Platform role $roleId not found") }
        val permissions = resolvePlatformPermissions(permissionIds)
        ensureRoleUpdateKeepsAdministrator(role, permissions)
        label?.let(role::updateProfile)
        role.replacePermissions(permissions)
        return platformRoleRepository.save(role).toTO()
    }

    override fun deleteRole(roleId: Long) {
        val role =
            platformRoleRepository.findById(roleId)
                .orElseThrow { NoSuchElementException("Platform role $roleId not found") }
        require(!platformUserRoleRepository.existsByRoleId(roleId)) {
            "Platform role '${role.name}' is assigned to users"
        }
        platformRoleRepository.delete(role)
    }

    override fun assignRole(
        userId: Long,
        roleId: Long,
    ): PlatformRoleAssignmentTO {
        require(!platformUserRoleRepository.existsByUserIdAndRoleId(userId, roleId)) {
            "Platform role $roleId is already assigned to user $userId"
        }
        val user =
            userRepository.findById(userId)
                .orElseThrow { NoSuchElementException("User $userId not found") }
        val role =
            platformRoleRepository.findById(roleId)
                .orElseThrow { NoSuchElementException("Platform role $roleId not found") }
        return platformUserRoleRepository.save(PlatformUserRole(user, role)).toTO()
    }

    override fun removeRole(
        userId: Long,
        roleId: Long,
    ) {
        val assignment =
            platformUserRoleRepository.findByUserIdAndRoleId(userId, roleId)
                ?: throw NoSuchElementException("Platform role $roleId is not assigned to user $userId")
        val removesAdministration = assignment.role.permissions.any { it.name == PermissionNames.Platform.ROLE_MANAGE }
        if (removesAdministration &&
            !platformUserRoleRepository.userHasPermissionThroughAnotherRole(userId, roleId, PermissionNames.Platform.ROLE_MANAGE)
        ) {
            require(platformUserRoleRepository.countActiveUsersWithPermission(PermissionNames.Platform.ROLE_MANAGE) > 1) {
                "Cannot remove the final active platform administrator"
            }
        }
        platformUserRoleRepository.delete(assignment)
    }

    private fun resolvePlatformPermissions(permissionIds: List<Long>): List<Permission> {
        val requestedIds = permissionIds.toSet()
        val permissions = permissionRepository.findAllById(requestedIds)
        val missingIds = requestedIds - permissions.mapTo(mutableSetOf()) { it.id }
        require(missingIds.isEmpty()) { "Permissions not found: ${missingIds.sorted()}" }
        val invalid = permissions.filter { it.scope != PermissionScope.PLATFORM }
        require(invalid.isEmpty()) {
            "Tenant or business permissions cannot be assigned to platform roles: ${invalid.map { it.name }.sorted()}"
        }
        return permissions
    }

    private fun ensureRoleUpdateKeepsAdministrator(
        role: PlatformRole,
        replacement: List<Permission>,
    ) {
        if (role.permissions.none { it.name == PermissionNames.Platform.ROLE_MANAGE } ||
            replacement.any { it.name == PermissionNames.Platform.ROLE_MANAGE }
        ) {
            return
        }

        val affectedActiveUsers =
            platformUserRoleRepository.findAllByRoleId(role.id)
                .asSequence()
                .filter { it.user.enabled && !it.user.locked }
                .count { assignment ->
                    !platformUserRoleRepository.userHasPermissionThroughAnotherRole(
                        assignment.user.id,
                        role.id,
                        PermissionNames.Platform.ROLE_MANAGE,
                    )
                }
        val remainingAdministrators =
            platformUserRoleRepository.countActiveUsersWithPermission(PermissionNames.Platform.ROLE_MANAGE) - affectedActiveUsers
        require(remainingAdministrators > 0) { "Cannot remove authority from the final active platform administrator" }
    }

    private fun PlatformRole.toTO() =
        PlatformRoleTO(
            id = id,
            name = name,
            label = label,
            permissionNames = permissions.map { it.name }.sorted(),
        )

    private fun PlatformUserRole.toTO() =
        PlatformRoleAssignmentTO(
            userId = user.id,
            userName = user.name,
            roleId = role.id,
            roleName = role.name,
        )
}
