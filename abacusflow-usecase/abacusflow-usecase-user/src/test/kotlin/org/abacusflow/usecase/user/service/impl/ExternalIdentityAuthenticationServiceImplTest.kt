package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.TenantPersistenceContext
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.db.user.PlatformUserRoleRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.tenant.TenantRole
import org.abacusflow.tenant.TenantStatus
import org.abacusflow.usecase.user.service.OidcUserProfileFetcher
import org.abacusflow.user.ExternalIdentity
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
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ExternalIdentityAuthenticationServiceImplTest {
    private val externalIdentityRepository = mock(ExternalIdentityRepository::class.java)
    private val userRepository = mock(UserRepository::class.java)
    private val tenantMembershipRepository = mock(TenantMembershipRepository::class.java)
    private val tenantRepository = mock(TenantRepository::class.java)
    private val platformUserRoleRepository = mock(PlatformUserRoleRepository::class.java)
    private val profileFetcher = mock(OidcUserProfileFetcher::class.java)
    private val tenantPersistenceContext = mock(TenantPersistenceContext::class.java)

    private val service =
        ExternalIdentityAuthenticationServiceImpl(
            externalIdentityRepository,
            userRepository,
            tenantMembershipRepository,
            tenantRepository,
            platformUserRoleRepository,
            profileFetcher,
            tenantPersistenceContext,
        )

    @Test
    fun `linked enabled identity with single tenant resolves tenant membership roles`() {
        val user = User("admin_user").apply { enable() }
        // user.id defaults to 0L in test (not persisted)
        val userId = user.id
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)
        identity.syncProfile(" ADMIN@EXAMPLE.COM ", true, null, null)
        val tenantRole = TenantRole("admin_role", tenantId = 10L)
        val membership = TenantMembership(tenantId = 10L, userId = userId).apply { addRole(tenantRole) }
        val tenant = Tenant("test-tenant")

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)
        `when`(tenantMembershipRepository.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE))
            .thenReturn(listOf(membership))
        `when`(tenantRepository.findByIdAndStatus(10L, TenantStatus.ACTIVE)).thenReturn(tenant)

        val result = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))

        assertEquals(user.name, result.name)
        assertEquals("admin@example.com", result.email)
        assertTrue(result.emailVerified)
        assertEquals(emptySet(), result.roleNames)
        assertEquals(1, result.tenantMemberships.size)
        assertEquals(setOf("admin_role"), result.tenantMemberships[0].roleNames)
        assertEquals(10L, result.tenantMemberships[0].tenantId)
        assertEquals("test-tenant", result.tenantMemberships[0].tenantName)
        verify(externalIdentityRepository, never()).save(any(ExternalIdentity::class.java))
    }

    @Test
    fun `linked enabled identity with multiple tenants returns empty roles at JWT level`() {
        val user = User("multi_tenant_user").apply { enable() }
        val userId = user.id
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)
        val tenantRole1 = TenantRole("role_a", tenantId = 10L)
        val tenantRole2 = TenantRole("role_b", tenantId = 20L)
        val membership1 = TenantMembership(tenantId = 10L, userId = userId).apply { addRole(tenantRole1) }
        val membership2 = TenantMembership(tenantId = 20L, userId = userId).apply { addRole(tenantRole2) }
        val tenant1 = Tenant("tenant-a")
        val tenant2 = Tenant("tenant-b")

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)
        `when`(tenantMembershipRepository.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE))
            .thenReturn(listOf(membership1, membership2))
        `when`(tenantRepository.findByIdAndStatus(10L, TenantStatus.ACTIVE)).thenReturn(tenant1)
        `when`(tenantRepository.findByIdAndStatus(20L, TenantStatus.ACTIVE)).thenReturn(tenant2)

        val result = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))

        // Multi-tenant users get empty roles at JWT level; tenant context resolves per-request
        assertEquals(emptySet(), result.roleNames)
        assertEquals(emptySet(), result.permissionNames)
        assertEquals(2, result.tenantMemberships.size)
    }

    @Test
    fun `platform administrator can simultaneously be tenant A administrator and tenant B reader`() {
        val user = User("combined_admin").apply { enable() }
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)
        val tenantAdminRole =
            TenantRole("admin", tenantId = 10L).apply {
                replacePermissions(listOf(permission("tenant:role:manage"), permission("business:product:update")))
            }
        val tenantReaderRole =
            TenantRole("reader", tenantId = 20L).apply {
                replacePermissions(listOf(permission("business:product:read")))
            }
        val memberships =
            listOf(
                TenantMembership(tenantId = 10L, userId = user.id).apply { addRole(tenantAdminRole) },
                TenantMembership(tenantId = 20L, userId = user.id).apply { addRole(tenantReaderRole) },
            )
        val platformRole =
            PlatformRole("platform-admin").apply {
                replacePermissions(listOf(permission("platform:tenant:list")))
            }

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)
        `when`(tenantMembershipRepository.findByUserIdAndStatus(user.id, MembershipStatus.ACTIVE)).thenReturn(memberships)
        `when`(tenantRepository.findByIdAndStatus(10L, TenantStatus.ACTIVE)).thenReturn(Tenant("tenant-a"))
        `when`(tenantRepository.findByIdAndStatus(20L, TenantStatus.ACTIVE)).thenReturn(Tenant("tenant-b"))
        `when`(platformUserRoleRepository.findAllByUserId(user.id)).thenReturn(listOf(PlatformUserRole(user, platformRole)))

        val result = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))

        assertEquals(setOf("platform-admin"), result.roleNames)
        assertEquals(setOf("platform:tenant:list"), result.permissionNames)
        assertEquals(
            setOf("tenant:role:manage", "business:product:update"),
            result.tenantMemberships.single { it.tenantId == 10L }.permissionNames,
        )
        assertEquals(
            setOf("business:product:read"),
            result.tenantMemberships.single { it.tenantId == 20L }.permissionNames,
        )
    }

    @Test
    fun `subsequent authority resolution reflects tenant role permission changes`() {
        val user = User("dynamic_grants").apply { enable() }
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)
        val role =
            TenantRole("operator", tenantId = 10L).apply {
                replacePermissions(listOf(permission("business:inventory:read")))
            }
        val membership = TenantMembership(tenantId = 10L, userId = user.id).apply { addRole(role) }

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)
        `when`(tenantMembershipRepository.findByUserIdAndStatus(user.id, MembershipStatus.ACTIVE))
            .thenReturn(listOf(membership))
        `when`(tenantRepository.findByIdAndStatus(10L, TenantStatus.ACTIVE)).thenReturn(Tenant("tenant-a"))

        val before = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))
        assertEquals(setOf("business:inventory:read"), before.tenantMemberships.single().permissionNames)

        role.replacePermissions(listOf(permission("business:inventory:update")))

        val after = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))
        assertEquals(setOf("business:inventory:update"), after.tenantMemberships.single().permissionNames)
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
    fun `active membership in suspended tenant is excluded from authorities`() {
        val user = User("suspended_tenant_user").apply { enable() }
        val userId = user.id
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)
        val tenantRole = TenantRole("admin_role", tenantId = 10L)
        val membership = TenantMembership(tenantId = 10L, userId = userId).apply { addRole(tenantRole) }

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)
        `when`(tenantMembershipRepository.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE))
            .thenReturn(listOf(membership))
        `when`(tenantRepository.findByIdAndStatus(10L, TenantStatus.ACTIVE)).thenReturn(null)

        val result = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))

        assertTrue(result.tenantMemberships.isEmpty())
        assertEquals(emptySet(), result.roleNames)
        assertEquals(emptySet(), result.permissionNames)
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

        // New users get no roles or self-service tenant creation; they can only accept an invitation.
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

    private fun permission(name: String): Permission = Permission.create(name, name, name)
}
