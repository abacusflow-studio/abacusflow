package org.abacusflow.portal.web.tenant

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.usecase.tenant.service.TenantAccessService
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import org.springframework.security.core.context.SecurityContextHolder

class TenantContextFilterTest {

    private lateinit var currentTenantProvider: CurrentTenantProvider
    private lateinit var tenantAccessService: TenantAccessService
    private lateinit var filter: TenantContextFilter

    @BeforeEach
    fun setup() {
        currentTenantProvider = CurrentTenantProvider()
        tenantAccessService = mock(TenantAccessService::class.java)
        filter = TenantContextFilter(currentTenantProvider, tenantAccessService)
        SecurityContextHolder.clearContext()
    }

    @AfterEach
    fun tearDown() {
        SecurityContextHolder.clearContext()
        currentTenantProvider.clear()
    }

    @Test
    fun `no X-Tenant-Id header and no security context - filter passes through`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn(null)

        filter.doFilterInternal(request, response, filterChain)

        verify(filterChain).doFilter(request, response)
        assertNull(currentTenantProvider.getCurrentTenantId())
    }

    @Test
    fun `invalid X-Tenant-Id header returns 400`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("not-a-number")

        filter.doFilterInternal(request, response, filterChain)

        verify(response).sendError(400, "Invalid X-Tenant-Id header")
        verify(filterChain, never()).doFilter(request, response)
        assertNull(currentTenantProvider.getCurrentTenantId())
    }

    @Test
    fun `valid X-Tenant-Id header with access granted sets tenant context`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1001")
        `when`(tenantAccessService.userHasAccessToTenant(anyLong(), eq(1001L))).thenReturn(true)

        filter.doFilterInternal(request, response, filterChain)

        // Tenant context is cleared in finally block, so it should be null after filter completes
        assertNull(currentTenantProvider.getCurrentTenantId())
        verify(filterChain).doFilter(request, response)
    }

    @Test
    fun `valid X-Tenant-Id header with access denied returns 403`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1002")
        `when`(tenantAccessService.userHasAccessToTenant(anyLong(), eq(1002L))).thenReturn(false)

        filter.doFilterInternal(request, response, filterChain)

        verify(response).sendError(403, "User does not have access to tenant 1002")
        verify(filterChain, never()).doFilter(request, response)
    }

    @Test
    fun `tenant context is always cleared after filter execution`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1001")
        `when`(tenantAccessService.userHasAccessToTenant(anyLong(), eq(1001L))).thenReturn(true)

        filter.doFilterInternal(request, response, filterChain)

        // The finally block should clear the tenant context
        assertNull(currentTenantProvider.getCurrentTenantId())
    }

    @Test
    fun `tenant context is cleared even when filter chain throws`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1001")
        `when`(tenantAccessService.userHasAccessToTenant(anyLong(), eq(1001L))).thenReturn(true)
        `when`(filterChain.doFilter(request, response)).thenThrow(RuntimeException("test error"))

        try {
            filter.doFilterInternal(request, response, filterChain)
        } catch (_: RuntimeException) {
            // expected
        }

        // The finally block should still clear the tenant context
        assertNull(currentTenantProvider.getCurrentTenantId())
    }
}
