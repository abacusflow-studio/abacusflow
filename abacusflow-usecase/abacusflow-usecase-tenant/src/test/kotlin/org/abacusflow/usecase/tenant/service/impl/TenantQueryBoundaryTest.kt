package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.db.TenantPersistenceContext
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.tenant.TenantStatus
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class TenantQueryBoundaryTest {
    private val tenantRepository = mock(TenantRepository::class.java)
    private val membershipRepository = mock(TenantMembershipRepository::class.java)
    private val persistenceContext = mock(TenantPersistenceContext::class.java)
    private val service = TenantQueryServiceImpl(tenantRepository, membershipRepository, persistenceContext)

    @Test
    fun `pending tenant is excluded even when a stale membership exists`() {
        `when`(membershipRepository.findByUserIdAndStatus(42, MembershipStatus.ACTIVE))
            .thenReturn(listOf(TenantMembership(1001, 42)))
        `when`(tenantRepository.findByIdAndStatus(1001, TenantStatus.ACTIVE)).thenReturn(null)

        assertTrue(service.listTenantsForUser(42).isEmpty())
    }

    @Test
    fun `platform directory includes pending tenant as control plane metadata`() {
        val pending = Tenant("pending", TenantStatus.PENDING_ACTIVATION)
        `when`(tenantRepository.findAll()).thenReturn(listOf(pending))

        assertEquals(listOf(TenantStatus.PENDING_ACTIVATION.name), service.listPlatformTenants().map { it.status })
    }
}
