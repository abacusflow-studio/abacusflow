package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.PlatformRoleRepository
import org.abacusflow.db.user.PlatformUserRoleRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.usecase.commons.security.PermissionNames
import org.abacusflow.user.Permission
import org.abacusflow.user.PlatformRole
import org.abacusflow.user.PlatformUserRole
import org.abacusflow.user.User
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class PlatformTenantRoleServiceImplTest {
    private val roleRepository = mock(PlatformRoleRepository::class.java)
    private val assignmentRepository = mock(PlatformUserRoleRepository::class.java)
    private val permissionRepository = mock(PermissionRepository::class.java)
    private val userRepository = mock(UserRepository::class.java)
    private val service = PlatformRoleServiceImpl(roleRepository, assignmentRepository, permissionRepository, userRepository)

    @Test
    fun `mixed platform and tenant permissions reject atomically`() {
        val role = PlatformRole("support").apply { updateProfile("Original") }
        val platformPermission = permission(11, "platform:user:read")
        val tenantPermission = permission(12, "tenant:member:read")
        role.replacePermissions(listOf(platformPermission))
        `when`(roleRepository.findById(1)).thenReturn(Optional.of(role))
        `when`(permissionRepository.findAllById(setOf(11L, 12L)))
            .thenReturn(listOf(platformPermission, tenantPermission))

        assertFailsWith<IllegalArgumentException> {
            service.updateRole(1, "Mutated", listOf(11, 12))
        }

        assertEquals("Original", role.label)
        assertEquals(setOf("platform:user:read"), role.permissions.map { it.name }.toSet())
        verify(roleRepository, never()).save(any(PlatformRole::class.java))
    }

    @Test
    fun `missing platform permission id rejects before role mutation`() {
        val role = PlatformRole("support").apply { updateProfile("Original") }
        `when`(roleRepository.findById(1)).thenReturn(Optional.of(role))
        `when`(permissionRepository.findAllById(setOf(999L))).thenReturn(emptyList())

        assertFailsWith<IllegalArgumentException> { service.updateRole(1, "Mutated", listOf(999)) }

        assertEquals("Original", role.label)
        verify(roleRepository, never()).save(any(PlatformRole::class.java))
    }

    @Test
    fun `final active platform administrator assignment cannot be removed`() {
        val administrator = User("admin@example.com")
        val role =
            PlatformRole("platform-admin").apply {
                replacePermissions(listOf(permission(11, PermissionNames.Platform.ROLE_MANAGE)))
            }
        val assignment = PlatformUserRole(administrator, role)
        `when`(assignmentRepository.findByUserIdAndRoleId(1, 2)).thenReturn(assignment)
        `when`(assignmentRepository.userHasPermissionThroughAnotherRole(1, 2, PermissionNames.Platform.ROLE_MANAGE))
            .thenReturn(false)
        `when`(assignmentRepository.countActiveUsersWithPermission(PermissionNames.Platform.ROLE_MANAGE))
            .thenReturn(1)

        assertFailsWith<IllegalArgumentException> { service.removeRole(1, 2) }

        verify(assignmentRepository, never()).delete(any(PlatformUserRole::class.java))
    }

    @Test
    fun `platform role update cannot remove authority from final active administrator`() {
        val administrator = User("admin@example.com")
        setId(administrator, 1)
        val role =
            PlatformRole("platform-admin").apply {
                replacePermissions(listOf(permission(11, PermissionNames.Platform.ROLE_MANAGE)))
            }
        setId(role, 2)
        val assignment = PlatformUserRole(administrator, role)
        val readPermission = permission(12, "platform:tenant:list")
        `when`(roleRepository.findById(2)).thenReturn(Optional.of(role))
        `when`(permissionRepository.findAllById(setOf(12L))).thenReturn(listOf(readPermission))
        `when`(assignmentRepository.findAllByRoleId(2)).thenReturn(listOf(assignment))
        `when`(assignmentRepository.userHasPermissionThroughAnotherRole(1, 2, PermissionNames.Platform.ROLE_MANAGE))
            .thenReturn(false)
        `when`(assignmentRepository.countActiveUsersWithPermission(PermissionNames.Platform.ROLE_MANAGE))
            .thenReturn(1)

        assertFailsWith<IllegalArgumentException> { service.updateRole(2, "Mutated", listOf(12)) }

        assertEquals(setOf(PermissionNames.Platform.ROLE_MANAGE), role.permissions.map { it.name }.toSet())
        verify(roleRepository, never()).save(any(PlatformRole::class.java))
    }

    private fun permission(
        id: Long,
        name: String,
    ): Permission =
        Permission.create(name, name, name).also { entity ->
            Permission::class.java.getDeclaredField("id").apply {
                isAccessible = true
                setLong(entity, id)
            }
        }

    private fun setId(
        target: Any,
        id: Long,
    ) {
        target.javaClass.getDeclaredField("id").apply {
            isAccessible = true
            setLong(target, id)
        }
    }
}
