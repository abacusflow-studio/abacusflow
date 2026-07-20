package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.db.TenantPersistenceContext
import org.abacusflow.db.tenant.TenantInvitationRepository
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.TenantRoleRepository
import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantInvitation
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.tenant.TenantStatus
import org.abacusflow.tenant.TenantRole
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class TenantInvitationSecurityTest {
    private val invitationRepository = mock(TenantInvitationRepository::class.java)
    private val membershipRepository = mock(TenantMembershipRepository::class.java)
    private val tenantRepository = mock(TenantRepository::class.java)
    private val roleRepository = mock(TenantRoleRepository::class.java)
    private val currentTenantProvider = CurrentTenantProvider()
    private val persistenceContext = mock(TenantPersistenceContext::class.java)
    private val service =
        TenantInvitationServiceImpl(
            invitationRepository,
            membershipRepository,
            tenantRepository,
            roleRepository,
            currentTenantProvider,
            persistenceContext,
        )

    @Test
    fun `stolen token with a different verified email remains unconsumed`() {
        val invitation = invitation()
        `when`(invitationRepository.findByToken(TOKEN)).thenReturn(invitation)

        assertFailsWith<IllegalArgumentException> {
            service.acceptInvitation(TOKEN, USER_ID, "attacker@example.com", true)
        }

        assertEquals("PENDING", invitation.status)
        verify(membershipRepository, never()).save(any(TenantMembership::class.java))
        verify(invitationRepository, never()).save(any(TenantInvitation::class.java))
    }

    @Test
    fun `matching but unverified email remains unconsumed`() {
        val invitation = invitation()
        `when`(invitationRepository.findByToken(TOKEN)).thenReturn(invitation)

        assertFailsWith<IllegalArgumentException> {
            service.acceptInvitation(TOKEN, USER_ID, "ADMIN@EXAMPLE.COM", false)
        }

        assertEquals("PENDING", invitation.status)
        verify(membershipRepository, never()).save(any(TenantMembership::class.java))
    }

    @Test
    fun `expired invitation remains unconsumed`() {
        val invitation = invitation(expiresAt = Instant.now().minus(1, ChronoUnit.DAYS))
        `when`(invitationRepository.findByToken(TOKEN)).thenReturn(invitation)

        assertFailsWith<IllegalArgumentException> {
            service.acceptInvitation(TOKEN, USER_ID, "admin@example.com", true)
        }

        assertEquals("PENDING", invitation.status)
        verify(membershipRepository, never()).save(any(TenantMembership::class.java))
    }

    @Test
    fun `normalized verified initial administrator email creates membership consumes invitation and activates tenant`() {
        val tenant = tenant()
        val role = role()
        val invitation = invitation()
        `when`(invitationRepository.findByToken(TOKEN)).thenReturn(invitation)
        `when`(tenantRepository.findById(TENANT_ID)).thenReturn(Optional.of(tenant))
        `when`(membershipRepository.existsByTenantIdAndUserId(TENANT_ID, USER_ID)).thenReturn(false)
        `when`(roleRepository.findById(ROLE_ID)).thenReturn(Optional.of(role))
        `when`(membershipRepository.save(any(TenantMembership::class.java))).thenAnswer { it.arguments[0] }
        `when`(invitationRepository.save(any(TenantInvitation::class.java))).thenAnswer { it.arguments[0] }
        `when`(tenantRepository.save(any(Tenant::class.java))).thenAnswer { it.arguments[0] }

        service.acceptInvitation(TOKEN, USER_ID, "  ADMIN@EXAMPLE.COM ", true)

        assertEquals("ACCEPTED", invitation.status)
        assertEquals(TenantStatus.ACTIVE, tenant.status)
        verify(membershipRepository).save(any(TenantMembership::class.java))
    }

    @Test
    fun `failure before membership persistence leaves initial invitation and tenant pending`() {
        val tenant = tenant()
        val role = role()
        val invitation = invitation()
        `when`(invitationRepository.findByToken(TOKEN)).thenReturn(invitation)
        `when`(tenantRepository.findById(TENANT_ID)).thenReturn(Optional.of(tenant))
        `when`(membershipRepository.existsByTenantIdAndUserId(TENANT_ID, USER_ID)).thenReturn(false)
        `when`(roleRepository.findById(ROLE_ID)).thenReturn(Optional.of(role))
        `when`(membershipRepository.save(any(TenantMembership::class.java))).thenThrow(IllegalStateException("database failure"))

        assertFailsWith<IllegalStateException> {
            service.acceptInvitation(TOKEN, USER_ID, "admin@example.com", true)
        }

        assertEquals("PENDING", invitation.status)
        assertEquals(TenantStatus.PENDING_ACTIVATION, tenant.status)
        verify(invitationRepository, never()).save(any(TenantInvitation::class.java))
    }

    @Test
    fun `reissue cancels previous initial invitation and returns a fresh one-time token`() {
        val tenant = tenant()
        val role = role()
        val oldInvitation = invitation()
        `when`(tenantRepository.findById(TENANT_ID)).thenReturn(Optional.of(tenant))
        `when`(invitationRepository.findAllByTenantId(TENANT_ID)).thenReturn(listOf(oldInvitation))
        `when`(roleRepository.findByName("admin")).thenReturn(role)
        `when`(invitationRepository.save(any(TenantInvitation::class.java))).thenAnswer { it.arguments[0] }

        val reissued = service.reissueInitialInvitation(TENANT_ID, " NEW@EXAMPLE.COM ", USER_ID)

        assertEquals("CANCELLED", oldInvitation.status)
        assertEquals("new@example.com", reissued.email)
        assertEquals("PENDING", reissued.status)
        kotlin.test.assertNotEquals(TOKEN, reissued.token)
        kotlin.test.assertTrue(reissued.initialAdministrator)
    }

    private fun invitation(expiresAt: Instant = Instant.now().plus(1, ChronoUnit.DAYS)) =
        TenantInvitation(
            tenantId = TENANT_ID,
            email = "admin@example.com",
            roleIds = mutableSetOf(ROLE_ID),
            token = TOKEN,
            expiresAt = expiresAt,
            initialAdministrator = true,
        )

    private fun tenant() =
        Tenant("pending-tenant", TenantStatus.PENDING_ACTIVATION).also {
            setId(it, TENANT_ID)
        }

    private fun role() = TenantRole("admin", TENANT_ID).also { setId(it, ROLE_ID) }

    private fun setId(
        target: Any,
        value: Long,
    ) {
        target.javaClass.getDeclaredField("id").apply {
            isAccessible = true
            setLong(target, value)
        }
    }

    private companion object {
        const val TENANT_ID = 1001L
        const val ROLE_ID = 2001L
        const val USER_ID = 3001L
        const val TOKEN = "secure-invitation-token"
    }
}
