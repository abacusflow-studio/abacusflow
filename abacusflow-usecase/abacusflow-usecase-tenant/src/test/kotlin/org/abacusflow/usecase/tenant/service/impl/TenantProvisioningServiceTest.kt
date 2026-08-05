package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.db.TenantPersistenceContext
import org.abacusflow.db.tenant.TenantInvitationRepository
import org.abacusflow.db.tenant.TenantPlacementRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.TenantRoleRepository
import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantInvitation
import org.abacusflow.tenant.TenantPlacement
import org.abacusflow.tenant.TenantRole
import org.abacusflow.tenant.TenantStatus
import org.abacusflow.usecase.tenant.CreateTenantInputTO
import org.abacusflow.user.Permission
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.springframework.security.access.prepost.PreAuthorize
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TenantProvisioningServiceTest {
    private val tenantRepository = mock(TenantRepository::class.java)
    private val invitationRepository = mock(TenantInvitationRepository::class.java)
    private val placementRepository = mock(TenantPlacementRepository::class.java)
    private val roleRepository = mock(TenantRoleRepository::class.java)
    private val permissionRepository = mock(PermissionRepository::class.java)
    private val persistenceContext = mock(TenantPersistenceContext::class.java)

    @Test
    fun `tenant provisioning command is platform authorized`() {
        val method =
            org.abacusflow.usecase.tenant.service.TenantCommandService::class.java
                .getMethod("createTenant", CreateTenantInputTO::class.java)
        assertEquals(
            "hasAuthority('platform:tenant:create')",
            method.getAnnotation(PreAuthorize::class.java).value,
        )
    }

    @Test
    fun `platform provisioning creates pending tenant defaults and initial invitation without membership`() {
        val permissions =
            listOf(
                permission(1, "platform:tenant:create"),
                permission(2, "tenant:profile:read"),
                permission(3, "tenant:profile:update"),
                permission(4, "tenant:member:create"),
                permission(5, "business:product:read"),
                permission(6, "business:product:create"),
            )
        var savedTenantRoles: List<TenantRole> = emptyList()
        `when`(tenantRepository.existsByName("acme")).thenReturn(false)
        `when`(tenantRepository.save(any(Tenant::class.java))).thenAnswer { invocation ->
            (invocation.arguments[0] as Tenant).also { setId(it, TENANT_ID) }
        }
        `when`(placementRepository.save(any(TenantPlacement::class.java))).thenAnswer { it.arguments[0] }
        `when`(permissionRepository.findAllByOrderByNameAsc()).thenReturn(permissions)
        `when`(roleRepository.saveAll(any<Iterable<TenantRole>>())).thenAnswer { invocation ->
            savedTenantRoles = (invocation.arguments[0] as Iterable<TenantRole>).toList()
            savedTenantRoles.forEachIndexed { index, role -> setId(role, 2001L + index) }
            savedTenantRoles
        }
        `when`(invitationRepository.save(any(TenantInvitation::class.java))).thenAnswer { invocation ->
            (invocation.arguments[0] as TenantInvitation).also { setId(it, 3001L) }
        }

        val result =
            service().createTenant(
                CreateTenantInputTO(
                    name = "acme",
                    displayName = "Acme",
                    initialAdministratorEmail = "  ADMIN@EXAMPLE.COM ",
                    createdByUserId = 42,
                ),
            )

        assertEquals(TenantStatus.PENDING_ACTIVATION.name, result.tenant.status)
        assertEquals("admin@example.com", result.initialInvitation.email)
        assertTrue(result.initialInvitation.initialAdministrator)
        val admin = savedTenantRoles.first { it.name == "admin" }
        val reader = savedTenantRoles.first { it.name == "reader" }
        val operator = savedTenantRoles.first { it.name == "operator" }
        assertEquals(
            setOf(
                "tenant:profile:read",
                "tenant:profile:update",
                "tenant:member:create",
                "business:product:read",
                "business:product:create",
            ),
            admin.permissions.map {
                it.name
            }.toSet(),
        )
        assertEquals(setOf("business:product:read"), reader.permissions.map { it.name }.toSet())
        assertEquals(
            setOf("business:product:read", "business:product:create"),
            operator.permissions.map { it.name }.toSet(),
        )
        assertTrue(savedTenantRoles.all { role -> role.permissions.none { it.name.startsWith("platform:") } })
        assertFalse(result.initialInvitation.roleIds.isEmpty())
    }

    private fun service() =
        TenantCommandServiceImpl(
            tenantRepository,
            invitationRepository,
            placementRepository,
            roleRepository,
            permissionRepository,
            persistenceContext,
        )

    private fun permission(
        id: Long,
        name: String,
    ) = Permission.create(name, name, name).also { setId(it, id) }

    private fun setId(
        target: Any,
        id: Long,
    ) {
        target.javaClass.getDeclaredField("id").apply {
            isAccessible = true
            setLong(target, id)
        }
    }

    private companion object {
        const val TENANT_ID = 1001L
    }
}
