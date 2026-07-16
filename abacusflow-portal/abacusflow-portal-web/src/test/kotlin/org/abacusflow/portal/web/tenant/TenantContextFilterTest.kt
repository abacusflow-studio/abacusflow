package org.abacusflow.portal.web.tenant

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.portal.web.authentication.AbacusFlowAuthenticationDetails
import org.abacusflow.usecase.user.AuthenticatedUserTO
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import java.time.Instant

class TenantContextFilterTest {

    private lateinit var currentTenantProvider: CurrentTenantProvider
    private lateinit var filter: TenantContextFilter

    @BeforeEach
    fun setup() {
        currentTenantProvider = CurrentTenantProvider()
        filter = TenantContextFilter(currentTenantProvider)
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

        filter.doFilter(request, response, filterChain)

        verify(filterChain).doFilter(request, response)
        assertNull(currentTenantProvider.getCurrentTenantId())
    }

    @Test
    fun `invalid X-Tenant-Id header returns 400`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("not-a-number")

        filter.doFilter(request, response, filterChain)

        verify(response).sendError(400, "Invalid tenant ID: not-a-number")
        verify(filterChain, never()).doFilter(request, response)
        assertNull(currentTenantProvider.getCurrentTenantId())
    }

    @Test
    fun `X-Tenant-Id in user memberships - access granted and tenant context set`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1001")
        setAuthenticatedUser(
            userId = 1L,
            memberships = listOf(
                AuthenticatedUserTO.TenantMembershipInfo(
                    tenantId = 1001L,
                    tenantName = "tenant-a",
                    tenantDisplayName = "Tenant A",
                    roleNames = setOf("admin"),
                    permissionNames = setOf("product:read"),
                ),
            ),
        )

        filter.doFilter(request, response, filterChain)

        // Tenant context is cleared in finally block
        assertNull(currentTenantProvider.getCurrentTenantId())
        verify(filterChain).doFilter(request, response)
        verify(response, never()).sendError(anyInt(), anyString())
    }

    @Test
    fun `X-Tenant-Id not in user memberships - access denied 403`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("9999")
        setAuthenticatedUser(
            userId = 1L,
            memberships = listOf(
                AuthenticatedUserTO.TenantMembershipInfo(
                    tenantId = 1001L,
                    tenantName = "tenant-a",
                    tenantDisplayName = "Tenant A",
                    roleNames = setOf("admin"),
                    permissionNames = setOf("product:read"),
                ),
            ),
        )

        filter.doFilter(request, response, filterChain)

        verify(response).sendError(403, "User does not have access to tenant 9999")
        verify(filterChain, never()).doFilter(request, response)
    }

    @Test
    fun `X-Tenant-Id with no authentication details - access denied 403`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1001")
        // Set authentication without AbacusFlowAuthenticationDetails
        val jwt = mock(Jwt::class.java)
        SecurityContextHolder.getContext().authentication = JwtAuthenticationToken(jwt, emptyList(), "user")

        filter.doFilter(request, response, filterChain)

        verify(response).sendError(403, "User does not have access to tenant 1001")
        verify(filterChain, never()).doFilter(request, response)
    }

    @Test
    fun `no X-Tenant-Id with single tenant membership - auto-select tenant`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn(null)
        setAuthenticatedUser(
            userId = 1L,
            memberships = listOf(
                AuthenticatedUserTO.TenantMembershipInfo(
                    tenantId = 1001L,
                    tenantName = "tenant-a",
                    tenantDisplayName = "Tenant A",
                    roleNames = setOf("admin"),
                    permissionNames = setOf("product:read"),
                ),
            ),
        )

        filter.doFilter(request, response, filterChain)

        // Tenant context is cleared in finally block, but filter chain should proceed
        verify(filterChain).doFilter(request, response)
    }

    @Test
    fun `tenant context is always cleared after filter execution`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1001")
        setAuthenticatedUser(
            userId = 1L,
            memberships = listOf(
                AuthenticatedUserTO.TenantMembershipInfo(
                    tenantId = 1001L,
                    tenantName = "tenant-a",
                    tenantDisplayName = "Tenant A",
                    roleNames = setOf("admin"),
                    permissionNames = emptySet(),
                ),
            ),
        )

        filter.doFilter(request, response, filterChain)

        assertNull(currentTenantProvider.getCurrentTenantId())
    }

    @Test
    fun `tenant context is cleared even when filter chain throws`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1001")
        setAuthenticatedUser(
            userId = 1L,
            memberships = listOf(
                AuthenticatedUserTO.TenantMembershipInfo(
                    tenantId = 1001L,
                    tenantName = "tenant-a",
                    tenantDisplayName = "Tenant A",
                    roleNames = setOf("admin"),
                    permissionNames = emptySet(),
                ),
            ),
        )
        `when`(filterChain.doFilter(request, response)).thenThrow(RuntimeException("test error"))

        try {
            filter.doFilter(request, response, filterChain)
        } catch (_: RuntimeException) {
            // expected
        }

        assertNull(currentTenantProvider.getCurrentTenantId())
    }

    private fun setAuthenticatedUser(
        userId: Long,
        memberships: List<AuthenticatedUserTO.TenantMembershipInfo>,
    ) {
        val jwt = Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .issuer("https://test.issuer")
            .subject("test-subject")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(300))
            .build()

        val details = AbacusFlowAuthenticationDetails(
            userId = userId,
            tenantMemberships = memberships,
        )

        val authentication = JwtAuthenticationToken(jwt, emptyList(), "user").apply {
            setDetails(details)
        }
        SecurityContextHolder.getContext().authentication = authentication
    }
}
