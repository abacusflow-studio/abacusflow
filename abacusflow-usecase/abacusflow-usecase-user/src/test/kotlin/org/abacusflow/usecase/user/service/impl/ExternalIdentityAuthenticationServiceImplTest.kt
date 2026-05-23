package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.user.ExternalIdentity
import org.abacusflow.user.Permission
import org.abacusflow.user.Role
import org.abacusflow.user.User
import org.junit.jupiter.api.Test
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class ExternalIdentityAuthenticationServiceImplTest {
    private val externalIdentityRepository = mock(ExternalIdentityRepository::class.java)
    private val userRepository = mock(UserRepository::class.java)
    private val service = ExternalIdentityAuthenticationServiceImpl(externalIdentityRepository, userRepository)

    @Test
    fun `linked enabled identity resolves business authorities`() {
        val identity = linkedIdentity()
        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)

        val user = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))

        assertEquals(identity.user.name, user.name)
        assertEquals(setOf("admin_role"), user.roleNames)
        assertEquals(setOf("user"), user.permissionNames)
    }

    @Test
    fun `unlinked identity is not authorized`() {
        stubPendingUserSave()

        val user = service.resolveAuthorizedUser(ISSUER, SUBJECT)

        assertNull(user)
    }

    @Test
    fun `unlinked identity registers pending disabled user and identity`() {
        stubPendingUserSave()

        val user =
            service.resolveAuthorizedUser(
                issuer = ISSUER,
                subject = SUBJECT,
                email = "new.user@example.com",
                displayName = "New User",
            )

        assertNull(user)

        val userCaptor = ArgumentCaptor.forClass(User::class.java)
        verify(userRepository).save(userCaptor.capture())
        assertEquals("New User", userCaptor.value.nick)
        assertFalse(userCaptor.value.enabled)
        assertEquals("oidc_", userCaptor.value.name.take(5))

        val identityCaptor = ArgumentCaptor.forClass(ExternalIdentity::class.java)
        verify(externalIdentityRepository).save(identityCaptor.capture())
        assertEquals(ISSUER, identityCaptor.value.issuer)
        assertEquals(SUBJECT, identityCaptor.value.subject)
        assertEquals("new.user@example.com", identityCaptor.value.email)
        assertEquals("New User", identityCaptor.value.displayName)
    }

    @Test
    fun `disabled identity is not authorized`() {
        val identity = linkedIdentity().apply { user.disable() }
        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)

        val user = service.resolveAuthorizedUser(ISSUER, SUBJECT)

        assertNull(user)
    }

    @Test
    fun `locked identity is not authorized`() {
        val identity = linkedIdentity().apply { user.lock() }
        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)

        val user = service.resolveAuthorizedUser(ISSUER, SUBJECT)

        assertNull(user)
    }

    private fun linkedIdentity(): ExternalIdentity {
        val user = User("admin_user")
        val role =
            Role("admin_role").apply {
                addPermission(Permission("user", "User management", "Manage users"))
            }
        user.addRole(role)
        return ExternalIdentity(ISSUER, SUBJECT, user)
    }

    private fun stubPendingUserSave() {
        `when`(userRepository.save(any(User::class.java))).thenAnswer { it.arguments[0] }
    }

    companion object {
        private const val ISSUER = "https://issuer.abacusflow.test/"
        private const val SUBJECT = "oidc-subject"
    }
}
