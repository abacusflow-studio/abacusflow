package org.abacusflow.usecase.transaction.scheduler

import org.abacusflow.commons.tenant.TenantContextHolder
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantStatus
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TenantSchedulerIsolationTest {
    @AfterEach
    fun clearTenantContext() {
        TenantContextHolder.clear()
    }

    @Test
    fun `sale scheduler establishes and clears context around each worker call`() {
        val tenantRepository = mock(TenantRepository::class.java)
        val worker = mock(SaleOrderStatusWorker::class.java)
        val tenantA = tenant(1001L)
        val tenantB = tenant(2001L)
        `when`(tenantRepository.findByStatus(TenantStatus.ACTIVE)).thenReturn(listOf(tenantA, tenantB))
        doAnswer {
            val tenantId = it.arguments[0] as Long
            assertEquals(tenantId, TenantContextHolder.currentTenantIdOrNull())
            null
        }.`when`(worker).autoCompleteEligibleOrders(org.mockito.ArgumentMatchers.anyLong())

        SaleOrderStatusScheduler(tenantRepository, worker).runAutoComplete()

        verify(worker).autoCompleteEligibleOrders(1001L)
        verify(worker).autoCompleteEligibleOrders(2001L)
        assertNull(TenantContextHolder.currentTenantIdOrNull())
    }

    @Test
    fun `purchase scheduler establishes and clears context around each worker call`() {
        val tenantRepository = mock(TenantRepository::class.java)
        val worker = mock(PurchaseOrderStatusWorker::class.java)
        val tenant = tenant(3001L)
        `when`(tenantRepository.findByStatus(TenantStatus.ACTIVE)).thenReturn(listOf(tenant))
        doAnswer {
            assertEquals(3001L, TenantContextHolder.currentTenantIdOrNull())
            null
        }.`when`(worker).autoCompleteEligibleOrders(3001L)

        PurchaseOrderStatusScheduler(tenantRepository, worker).runAutoComplete()

        verify(worker).autoCompleteEligibleOrders(3001L)
        assertNull(TenantContextHolder.currentTenantIdOrNull())
    }

    private fun tenant(id: Long): Tenant =
        mock(Tenant::class.java).also {
            `when`(it.id).thenReturn(id)
        }
}
