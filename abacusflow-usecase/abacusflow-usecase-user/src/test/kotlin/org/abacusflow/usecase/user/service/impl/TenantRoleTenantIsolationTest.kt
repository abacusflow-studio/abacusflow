package org.abacusflow.usecase.user.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.TenantRoleRepository
import org.abacusflow.tenant.TenantRole
import org.abacusflow.usecase.user.CreateTenantRoleInputTO
import org.abacusflow.usecase.user.UpdateTenantRoleInputTO
import org.abacusflow.user.Permission
import org.abacusflow.user.PermissionScope
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class TenantRoleTenantIsolationTest {
    private val currentTenantProvider = CurrentTenantProvider()
    private val roleRepository = mock(TenantRoleRepository::class.java)
    private val permissionRepository = mock(PermissionRepository::class.java)
    private val membershipRepository = mock(TenantMembershipRepository::class.java)

    @AfterEach
    fun clearTenantContext() {
        currentTenantProvider.clear()
    }

    @Test
    fun `permission scope is classified deterministically from immutable name`() {
        assertEquals(PermissionScope.PLATFORM, Permission.create("platform:user:read", "", "").scope)
        assertEquals(PermissionScope.TENANT, Permission.create("tenant:member:read", "", "").scope)
        assertEquals(PermissionScope.BUSINESS, Permission.create("business:product:read", "", "").scope)
    }

    @Test
    fun `role update cannot load a role from another tenant`() {
        currentTenantProvider.setTenantId(TENANT_ID)
        `when`(roleRepository.findById(ROLE_ID)).thenReturn(Optional.empty())

        val service = commandService()

        assertFailsWith<NoSuchElementException> {
            service.updateRole(ROLE_ID, UpdateTenantRoleInputTO(label = "forged", permissionIds = emptyList()))
        }
        verify(roleRepository, never()).save(any(TenantRole::class.java))
    }

    @Test
    fun `role query uses the filter scoped repository query`() {
        currentTenantProvider.setTenantId(TENANT_ID)
        val tenantRole = TenantRole(name = "reader", tenantId = TENANT_ID)
        `when`(roleRepository.findAll()).thenReturn(listOf(tenantRole))

        val result = queryService().listRoles()

        assertEquals(listOf("reader"), result.map { it.name })
        verify(roleRepository).findAll()
    }

    @Test
    fun `tenant role cannot be created with a platform permission`() {
        currentTenantProvider.setTenantId(TENANT_ID)
        val platformPermission = permission(3001L, "platform:tenant:create")
        `when`(roleRepository.findByName("forged-admin")).thenReturn(null)
        `when`(permissionRepository.findAllById(setOf(3001L))).thenReturn(listOf(platformPermission))

        assertFailsWith<IllegalArgumentException> {
            commandService().createRole(
                CreateTenantRoleInputTO(
                    name = "forged-admin",
                    label = "Forged",
                    permissionIds = listOf(3001L),
                ),
            )
        }

        verify(roleRepository, never()).save(any(TenantRole::class.java))
    }

    @Test
    fun `mixed invalid permission IDs leave role unchanged`() {
        currentTenantProvider.setTenantId(TENANT_ID)
        val existingPermission = permission(3002L, "business:product:read")
        val tenantRole =
            TenantRole(name = "reader", tenantId = TENANT_ID).apply {
                updateProfile("Original")
                addPermission(existingPermission)
            }
        `when`(roleRepository.findById(ROLE_ID)).thenReturn(Optional.of(tenantRole))
        `when`(permissionRepository.findAllById(setOf(3002L, 9999L))).thenReturn(listOf(existingPermission))

        assertFailsWith<IllegalArgumentException> {
            commandService().updateRole(
                ROLE_ID,
                UpdateTenantRoleInputTO(label = "Mutated", permissionIds = listOf(3002L, 9999L)),
            )
        }

        assertEquals("Original", tenantRole.label)
        assertEquals(setOf("business:product:read"), tenantRole.permissions.map { it.name }.toSet())
        verify(roleRepository, never()).save(any(TenantRole::class.java))
    }

    @Test
    fun `tenant assignable catalog excludes platform permissions by repository scope`() {
        currentTenantProvider.setTenantId(TENANT_ID)
        val tenantPermission = permission(3003L, "tenant:member:read")
        val businessPermission = permission(3004L, "business:product:read")
        val scopes = setOf(PermissionScope.TENANT, PermissionScope.BUSINESS)
        `when`(permissionRepository.findAllByScopeInOrderByNameAsc(scopes))
            .thenReturn(listOf(tenantPermission, businessPermission))

        val result = queryService().listTenantAssignablePermissions()

        assertEquals(listOf("tenant:member:read", "business:product:read"), result.map { it.name })
        verify(permissionRepository).findAllByScopeInOrderByNameAsc(scopes)
    }

    private fun permission(
        id: Long,
        name: String,
    ): Permission =
        Permission.create(name = name, label = name, description = name).also { permission ->
            Permission::class.java.getDeclaredField("id").apply {
                isAccessible = true
                setLong(permission, id)
            }
        }

    private fun commandService() =
        TenantRoleCommandServiceImpl(
            roleRepository,
            permissionRepository,
            membershipRepository,
            currentTenantProvider,
        )

    private fun queryService() =
        TenantRoleQueryServiceImpl(
            roleRepository,
            permissionRepository,
            currentTenantProvider,
        )

    companion object {
        private const val TENANT_ID = 1001L
        private const val ROLE_ID = 2001L
    }
}
