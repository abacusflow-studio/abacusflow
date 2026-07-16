package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.user.ExternalIdentity
import org.abacusflow.user.Role
import org.abacusflow.user.User
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ExternalIdentityAuthenticationServiceImplTest {
    private val externalIdentityRepository = mock(ExternalIdentityRepository::class.java)
    private val userRepository = mock(UserRepository::class.java)
    private val tenantMembershipRepository = mock(TenantMembershipRepository::class.java)
    private val tenantRepository = mock(TenantRepository::class.java)

    private val service =
        ExternalIdentityAuthenticationServiceImpl(
            externalIdentityRepository,
            userRepository,
            tenantMembershipRepository,
            tenantRepository,
        )

    @Test
    fun `linked enabled identity with single tenant resolves tenant membership roles`() {
        val user = User("admin_user").apply { enable() }
        // user.id defaults to 0L in test (not persisted)
        val userId = user.id
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)
        val role = Role("admin_role", tenantId = 10L)
        val membership = TenantMembership(tenantId = 10L, userId = userId).apply { addRole(role) }
        val tenant = Tenant("test-tenant")

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)
        `when`(tenantMembershipRepository.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE))
            .thenReturn(listOf(membership))
        `when`(tenantRepository.findById(10L)).thenReturn(Optional.of(tenant))

        val result = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))

        assertEquals(user.name, result.name)
        assertEquals(setOf("admin_role"), result.roleNames)
        assertEquals(1, result.tenantMemberships.size)
        assertEquals(10L, result.tenantMemberships[0].tenantId)
        assertEquals("test-tenant", result.tenantMemberships[0].tenantName)
        verify(externalIdentityRepository, never()).save(any(ExternalIdentity::class.java))
    }

    @Test
    fun `linked enabled identity with multiple tenants returns empty roles at JWT level`() {
        val user = User("multi_tenant_user").apply { enable() }
        val userId = user.id
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)
        val role1 = Role("role_a", tenantId = 10L)
        val role2 = Role("role_b", tenantId = 20L)
        val membership1 = TenantMembership(tenantId = 10L, userId = userId).apply { addRole(role1) }
        val membership2 = TenantMembership(tenantId = 20L, userId = userId).apply { addRole(role2) }
        val tenant1 = Tenant("tenant-a")
        val tenant2 = Tenant("tenant-b")

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)
        `when`(tenantMembershipRepository.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE))
            .thenReturn(listOf(membership1, membership2))
        `when`(tenantRepository.findById(10L)).thenReturn(Optional.of(tenant1))
        `when`(tenantRepository.findById(20L)).thenReturn(Optional.of(tenant2))

        val result = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))

        // Multi-tenant users get empty roles at JWT level; tenant context resolves per-request
        assertEquals(emptySet(), result.roleNames)
        assertEquals(emptySet(), result.permissionNames)
        assertEquals(2, result.tenantMemberships.size)
    }

    @Test
    fun `linked enabled identity with no tenant memberships returns empty roles`() {
        val user = User("no_tenant_user").apply { enable() }
        val userId = user.id
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)
        `when`(tenantMembershipRepository.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE))
            .thenReturn(emptyList())

        val result = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))

        assertEquals(emptySet(), result.roleNames)
        assertEquals(emptySet(), result.permissionNames)
        assertTrue(result.tenantMemberships.isEmpty())
    }

    @Test
    fun `disabled identity is not authorized`() {
        val user = User("disabled_user").apply { disable() }
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)

        val result = service.resolveAuthorizedUser(ISSUER, SUBJECT)

        assertNull(result)
    }

    @Test
    fun `locked identity is not authorized`() {
        val user = User("locked_user").apply { lock() }
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)

        val result = service.resolveAuthorizedUser(ISSUER, SUBJECT)

        assertNull(result)
    }

    @Test
    fun `new unlinked identity creates user with no roles`() {
        val savedUser = User("oidc_generated_name").apply { enable() }

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(null)
        `when`(userRepository.save(any(User::class.java))).thenReturn(savedUser)
        `when`(externalIdentityRepository.save(any(ExternalIdentity::class.java))).thenAnswer { it.arguments[0] }

        val result = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))

        // New users get no roles — they need to create/join a tenant (onboarding)
        assertEquals(emptySet(), result.roleNames)
        assertEquals(emptySet(), result.permissionNames)
        assertTrue(result.tenantMemberships.isEmpty())
        verify(userRepository).save(any(User::class.java))
        verify(externalIdentityRepository).save(any(ExternalIdentity::class.java))
    }

    companion object {
        private const val ISSUER = "https://issuer.abacusflow.test/"
        private const val SUBJECT = "oidc-subject"
    }
}
