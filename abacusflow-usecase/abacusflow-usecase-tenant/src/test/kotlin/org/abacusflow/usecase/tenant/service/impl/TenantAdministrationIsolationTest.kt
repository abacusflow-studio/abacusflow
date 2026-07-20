package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.db.TenantPersistenceContext
import org.abacusflow.db.tenant.TenantInvitationRepository
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.TenantRoleRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.user.Permission
import org.abacusflow.tenant.TenantRole
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

class TenantAdministrationIsolationTest {
    private val currentTenantProvider = CurrentTenantProvider()
    private val membershipRepository = mock(TenantMembershipRepository::class.java)
    private val invitationRepository = mock(TenantInvitationRepository::class.java)
    private val tenantRepository = mock(TenantRepository::class.java)
    private val roleRepository = mock(TenantRoleRepository::class.java)
    private val userRepository = mock(UserRepository::class.java)
    private val tenantPersistenceContext = mock(TenantPersistenceContext::class.java)

    @AfterEach
    fun clearTenantContext() {
        currentTenantProvider.clear()
    }

    @Test
    fun `membership role update cannot load a membership from another tenant`() {
        currentTenantProvider.setTenantId(TENANT_ID)
        `when`(membershipRepository.findByIdAndTenantId(MEMBERSHIP_ID, TENANT_ID)).thenReturn(null)

        val service = membershipService()

        assertFailsWith<NoSuchElementException> {
            service.updateMemberRoles(MEMBERSHIP_ID, emptyList())
        }
        verify(membershipRepository, never()).save(any(TenantMembership::class.java))
    }

    @Test
    fun `forged role id does not partially clear membership roles`() {
        currentTenantProvider.setTenantId(TENANT_ID)
        val existingTenantRole = TenantRole(name = "reader", tenantId = TENANT_ID)
        val membership =
            TenantMembership(tenantId = TENANT_ID, userId = 42).apply {
                addRole(existingTenantRole)
            }
        `when`(membershipRepository.findByIdAndTenantId(MEMBERSHIP_ID, TENANT_ID)).thenReturn(membership)
        `when`(roleRepository.findById(OTHER_TENANT_ROLE_ID)).thenReturn(Optional.empty())

        val service = membershipService()

        assertFailsWith<NoSuchElementException> {
            service.updateMemberRoles(MEMBERSHIP_ID, listOf(OTHER_TENANT_ROLE_ID))
        }
        assertEquals(setOf(existingTenantRole), membership.tenantRoles)
        verify(membershipRepository, never()).save(any(TenantMembership::class.java))
    }

    @Test
    fun `invitation cancellation cannot load an invitation from another tenant`() {
        currentTenantProvider.setTenantId(TENANT_ID)
        `when`(invitationRepository.findByIdAndTenantId(INVITATION_ID, TENANT_ID)).thenReturn(null)

        val service = invitationService()

        assertFailsWith<NoSuchElementException> {
            service.cancelInvitation(INVITATION_ID)
        }
        verify(invitationRepository, never()).delete(any())
    }

    @Test
    fun `final effective tenant administrator cannot be demoted`() {
        currentTenantProvider.setTenantId(TENANT_ID)
        val adminRole = administratorRole()
        val readerTenantRole = TenantRole(name = "reader", tenantId = TENANT_ID)
        val membership = TenantMembership(tenantId = TENANT_ID, userId = 42).apply { addRole(adminRole) }
        setId(membership, MEMBERSHIP_ID)
        setId(readerTenantRole, OTHER_TENANT_ROLE_ID)
        `when`(membershipRepository.findByIdAndTenantId(MEMBERSHIP_ID, TENANT_ID)).thenReturn(membership)
        `when`(roleRepository.findById(OTHER_TENANT_ROLE_ID)).thenReturn(Optional.of(readerTenantRole))
        `when`(membershipRepository.findByTenantId(TENANT_ID)).thenReturn(listOf(membership))

        assertFailsWith<IllegalArgumentException> {
            membershipService().updateMemberRoles(MEMBERSHIP_ID, listOf(OTHER_TENANT_ROLE_ID))
        }

        assertEquals(setOf(adminRole), membership.tenantRoles)
        verify(membershipRepository, never()).save(any(TenantMembership::class.java))
    }

    @Test
    fun `final effective tenant administrator cannot be removed`() {
        val membership = TenantMembership(tenantId = TENANT_ID, userId = 42).apply { addRole(administratorRole()) }
        setId(membership, MEMBERSHIP_ID)
        `when`(membershipRepository.findByTenantIdAndUserId(TENANT_ID, 42)).thenReturn(membership)
        `when`(membershipRepository.findByTenantId(TENANT_ID)).thenReturn(listOf(membership))

        assertFailsWith<IllegalArgumentException> { membershipService().removeMember(TENANT_ID, 42) }

        verify(membershipRepository, never()).delete(any(TenantMembership::class.java))
    }

    private fun administratorRole() =
        TenantRole(name = "admin", tenantId = TENANT_ID).apply {
            listOf("tenant:member:create", "tenant:member:remove", "tenant:role:manage").forEach { name ->
                addPermission(Permission.create(name, name, name))
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

    private fun membershipService() =
        TenantMembershipServiceImpl(
            membershipRepository,
            roleRepository,
            userRepository,
            currentTenantProvider,
        )

    private fun invitationService() =
        TenantInvitationServiceImpl(
            invitationRepository,
            membershipRepository,
            tenantRepository,
            roleRepository,
            currentTenantProvider,
            tenantPersistenceContext,
        )

    companion object {
        private const val TENANT_ID = 1001L
        private const val MEMBERSHIP_ID = 2001L
        private const val INVITATION_ID = 3001L
        private const val OTHER_TENANT_ROLE_ID = 4001L
    }
}
