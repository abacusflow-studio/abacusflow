package org.abacusflow.commons.tenant

import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class CurrentTenantProviderTest {

    private val provider = CurrentTenantProvider()

    @AfterTest
    fun tearDown() {
        provider.clear()
    }

    @Test
    fun `initially no tenant context`() {
        assertNull(provider.getCurrentTenantId())
    }

    @Test
    fun `requireTenantId throws when no context`() {
        assertFailsWith<IllegalStateException> {
            provider.requireTenantId()
        }
    }

    @Test
    fun `set and get tenantId`() {
        provider.setTenantId(1001L)
        assertEquals(1001L, provider.getCurrentTenantId())
        assertEquals(1001L, provider.requireTenantId())
    }

    @Test
    fun `clear removes tenantId`() {
        provider.setTenantId(1001L)
        provider.clear()
        assertNull(provider.getCurrentTenantId())
    }

    @Test
    fun `switch between tenants`() {
        provider.setTenantId(1001L)
        assertEquals(1001L, provider.getCurrentTenantId())

        provider.setTenantId(1002L)
        assertEquals(1002L, provider.getCurrentTenantId())
    }

    @Test
    fun `ThreadLocal isolation - different threads have different tenants`() {
        provider.setTenantId(1001L)

        val thread = Thread {
            assertNull(provider.getCurrentTenantId())
            provider.setTenantId(2001L)
            assertEquals(2001L, provider.getCurrentTenantId())
            provider.clear()
        }
        thread.start()
        thread.join()

        // Main thread still has tenant A
        assertEquals(1001L, provider.getCurrentTenantId())
    }

    @Test
    fun `requireTenantId returns value after set`() {
        provider.setTenantId(42L)
        assertEquals(42L, provider.requireTenantId())
    }

    @Test
    fun `requireTenantId throws after clear`() {
        provider.setTenantId(1001L)
        provider.clear()
        assertFailsWith<IllegalStateException> {
            provider.requireTenantId()
        }
    }
}
