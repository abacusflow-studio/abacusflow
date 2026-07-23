package org.abacusflow.usecase.user.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.db.TenantPersistenceContext
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.db.user.PlatformUserRoleRepository
import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.usecase.user.service.OidcUserProfileFetcher
import org.abacusflow.user.ExternalIdentity
import org.abacusflow.user.User
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class UserAuthenticationServiceImplTest {
    private val externalIdentityRepository = mock(ExternalIdentityRepository::class.java)
    private val tenantMembershipRepository = mock(TenantMembershipRepository::class.java)
    private val tenantRepository = mock(TenantRepository::class.java)
    private val platformUserRoleRepository = mock(PlatformUserRoleRepository::class.java)
    private val profileFetcher = mock(OidcUserProfileFetcher::class.java)
    private val tenantPersistenceContext = mock(TenantPersistenceContext::class.java)

    private val service =
        UserAuthenticationServiceImpl(
            externalIdentityRepository,
            tenantMembershipRepository,
            tenantRepository,
            platformUserRoleRepository,
            CurrentTenantProvider(),
            profileFetcher,
            tenantPersistenceContext,
        )

    @Test
    fun `bootstrap immediately refreshes a recently synced unverified email`() {
        val user = User("invited_user").apply { enable() }
        val identity = ExternalIdentity(ISSUER, SUBJECT, user)
        identity.syncProfile("invited@example.com", false, null, null)

        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)
        `when`(tenantMembershipRepository.findByUserIdAndStatus(user.id, MembershipStatus.ACTIVE))
            .thenReturn(emptyList())
        `when`(platformUserRoleRepository.findAllByUserId(user.id)).thenReturn(emptyList())
        `when`(profileFetcher.fetchProfile(ACCESS_TOKEN))
            .thenReturn(
                OidcUserProfileFetcher.Profile(
                    subject = SUBJECT,
                    email = "invited@example.com",
                    emailVerified = true,
                    displayName = null,
                    pictureUrl = null,
                ),
            )

        val result = service.bootstrap(ISSUER, SUBJECT, ACCESS_TOKEN)

        assertEquals("invited@example.com", result.email)
        assertTrue(result.emailVerified)
        verify(profileFetcher).fetchProfile(ACCESS_TOKEN)
        verify(externalIdentityRepository).save(identity)
    }

    companion object {
        private const val ISSUER = "https://issuer.abacusflow.test/"
        private const val SUBJECT = "oidc-subject"
        private const val ACCESS_TOKEN = "access-token"
    }
}
