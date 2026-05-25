package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.db.user.RoleRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.user.ExternalIdentity
import org.abacusflow.user.Permission
import org.abacusflow.user.Role
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

class ExternalIdentityAuthenticationServiceImplTest {
    private val externalIdentityRepository = mock(ExternalIdentityRepository::class.java)
    private val userRepository = mock(UserRepository::class.java)
    private val roleRepository = mock(RoleRepository::class.java)

    private val service =
        ExternalIdentityAuthenticationServiceImpl(externalIdentityRepository, userRepository, roleRepository)

    @Test
    fun `linked enabled identity resolves business authorities`() {
        val identity = linkedIdentity()
        `when`(externalIdentityRepository.findByIssuerAndSubject(ISSUER, SUBJECT)).thenReturn(identity)

        val user = assertNotNull(service.resolveAuthorizedUser(ISSUER, SUBJECT))

        assertEquals(identity.user.name, user.name)
        assertEquals(setOf("admin_role"), user.roleNames)
        assertEquals(setOf("user"), user.permissionNames)
        verify(externalIdentityRepository, never()).save(any(ExternalIdentity::class.java))
    }

    @Test
    fun `unlinked identity is not authorized`() {
        val user = service.resolveAuthorizedUser(ISSUER, SUBJECT)

        assertNull(user)
        verify(externalIdentityRepository, never()).save(any(ExternalIdentity::class.java))
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

    companion object {
        private const val ISSUER = "https://issuer.abacusflow.test/"
        private const val SUBJECT = "oidc-subject"
    }
}
