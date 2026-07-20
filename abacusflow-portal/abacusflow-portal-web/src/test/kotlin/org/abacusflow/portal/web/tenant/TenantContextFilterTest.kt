package org.abacusflow.portal.web.tenant

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.portal.web.authentication.AbacusFlowAuthenticationDetails
import org.abacusflow.portal.web.authentication.TenantAuthorityBuilder
import org.abacusflow.usecase.user.AuthenticatedUserTO
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
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
        `when`(request.requestURI).thenReturn("/products")
        `when`(request.contextPath).thenReturn("")

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
            memberships =
                listOf(
                    AuthenticatedUserTO.TenantMembershipInfo(
                        tenantId = 1001L,
                        tenantName = "tenant-a",
                        tenantDisplayName = "Tenant A",
                        roleNames = setOf("admin"),
                        permissionNames = setOf("business:product:read"),
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
        `when`(request.requestURI).thenReturn("/products")
        `when`(request.contextPath).thenReturn("")
        setAuthenticatedUser(
            userId = 1L,
            memberships =
                listOf(
                    AuthenticatedUserTO.TenantMembershipInfo(
                        tenantId = 1001L,
                        tenantName = "tenant-a",
                        tenantDisplayName = "Tenant A",
                        roleNames = setOf("admin"),
                        permissionNames = setOf("business:product:read"),
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
        `when`(request.requestURI).thenReturn("/products")
        `when`(request.contextPath).thenReturn("")
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
            memberships =
                listOf(
                    AuthenticatedUserTO.TenantMembershipInfo(
                        tenantId = 1001L,
                        tenantName = "tenant-a",
                        tenantDisplayName = "Tenant A",
                        roleNames = setOf("admin"),
                        permissionNames = setOf("business:product:read"),
                    ),
                ),
        )

        filter.doFilter(request, response, filterChain)

        // Tenant context is cleared in finally block, but filter chain should proceed
        verify(filterChain).doFilter(request, response)
    }

    @Test
    fun `multi-tenant business request without tenant header returns 400`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn(null)
        `when`(request.requestURI).thenReturn("/products")
        `when`(request.contextPath).thenReturn("")
        setAuthenticatedUser(
            userId = 1L,
            memberships = listOf(membership(1001L), membership(2001L)),
        )

        filter.doFilter(request, response, filterChain)

        verify(response).sendError(400, "X-Tenant-Id header is required for this endpoint")
        verify(filterChain, never()).doFilter(request, response)
    }

    @Test
    fun `tenant-scoped path behind api proxy still requires tenant header`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn(null)
        `when`(request.requestURI).thenReturn("/api/products")
        `when`(request.contextPath).thenReturn("")
        setAuthenticatedUser(
            userId = 1L,
            memberships = listOf(membership(1001L), membership(2001L)),
        )

        filter.doFilter(request, response, filterChain)

        verify(response).sendError(400, "X-Tenant-Id header is required for this endpoint")
        verify(filterChain, never()).doFilter(request, response)
    }

    @Test
    fun `multi-tenant bootstrap request without tenant header remains available`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn(null)
        `when`(request.requestURI).thenReturn("/me/bootstrap")
        `when`(request.contextPath).thenReturn("")
        setAuthenticatedUser(
            userId = 1L,
            memberships = listOf(membership(1001L), membership(2001L)),
        )

        filter.doFilter(request, response, filterChain)

        verify(filterChain).doFilter(request, response)
        verify(response, never()).sendError(anyInt(), anyString())
    }

    @Test
    fun `stale cached tenant header does not block tenant-neutral bootstrap`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1001")
        `when`(request.requestURI).thenReturn("/me/bootstrap")
        `when`(request.contextPath).thenReturn("")
        setAuthenticatedUser(
            userId = 101L,
            memberships = listOf(membership(2001L), membership(3001L)),
        )

        filter.doFilter(request, response, filterChain)

        verify(filterChain).doFilter(request, response)
        verify(response, never()).sendError(anyInt(), anyString())
        assertNull(currentTenantProvider.getCurrentTenantId())
    }

    @Test
    fun `stale cached tenant header is still rejected on tenant-scoped API`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1001")
        `when`(request.requestURI).thenReturn("/products")
        `when`(request.contextPath).thenReturn("")
        setAuthenticatedUser(
            userId = 101L,
            memberships = listOf(membership(2001L)),
        )

        filter.doFilter(request, response, filterChain)

        verify(response).sendError(403, "User does not have access to tenant 1001")
        verify(filterChain, never()).doFilter(request, response)
    }

    @Test
    fun `tenant context is always cleared after filter execution`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)

        `when`(request.getHeader("X-Tenant-Id")).thenReturn("1001")
        setAuthenticatedUser(
            userId = 1L,
            memberships =
                listOf(
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
            memberships =
                listOf(
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

    @Test
    fun `tenant switch preserves platform authority and drops previous tenant authority`() {
        val request = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val filterChain = mock(FilterChain::class.java)
        `when`(request.getHeader("X-Tenant-Id")).thenReturn("2001")
        setAuthenticatedUser(
            userId = 1,
            memberships =
                listOf(
                    membership(1001).copy(permissionNames = setOf("business:product:create")),
                    membership(2001).copy(permissionNames = setOf("business:product:read")),
                ),
            platformRoles = setOf("platform-admin"),
            platformPermissions = setOf("platform:tenant:list"),
        )

        filter.doFilter(request, response, filterChain)

        val authorities = SecurityContextHolder.getContext().authentication.authorities.map { it.authority }.toSet()
        assertTrue("platform:tenant:list" in authorities)
        assertTrue("business:product:read" in authorities)
        assertFalse("business:product:create" in authorities)
    }

    @Test
    fun `platform administrator without membership can use platform route but not tenant business route`() {
        val platformRequest = mock(HttpServletRequest::class.java)
        val response = mock(HttpServletResponse::class.java)
        val platformChain = mock(FilterChain::class.java)
        `when`(platformRequest.getHeader("X-Tenant-Id")).thenReturn(null)
        `when`(platformRequest.requestURI).thenReturn("/platform/tenants")
        `when`(platformRequest.contextPath).thenReturn("")
        setAuthenticatedUser(1, emptyList(), platformPermissions = setOf("platform:tenant:list"))

        filter.doFilter(platformRequest, response, platformChain)
        verify(platformChain).doFilter(platformRequest, response)

        val businessRequest = mock(HttpServletRequest::class.java)
        val businessChain = mock(FilterChain::class.java)
        `when`(businessRequest.getHeader("X-Tenant-Id")).thenReturn(null)
        `when`(businessRequest.requestURI).thenReturn("/products")
        `when`(businessRequest.contextPath).thenReturn("")
        filter.doFilter(businessRequest, response, businessChain)
        verify(response).sendError(403, "User does not have access to an active tenant")
        verify(businessChain, never()).doFilter(businessRequest, response)
    }

    private fun setAuthenticatedUser(
        userId: Long,
        memberships: List<AuthenticatedUserTO.TenantMembershipInfo>,
        platformRoles: Set<String> = emptySet(),
        platformPermissions: Set<String> = emptySet(),
    ) {
        val jwt =
            Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .issuer("https://test.issuer")
                .subject("test-subject")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .build()

        val details =
            AbacusFlowAuthenticationDetails(
                userId = userId,
                tenantMemberships = memberships,
                platformRoleNames = platformRoles,
                platformPermissionNames = platformPermissions,
            )

        val authentication =
            JwtAuthenticationToken(
                jwt,
                TenantAuthorityBuilder.buildAuthorities(platformRoles, platformPermissions),
                "user",
            ).apply {
                setDetails(details)
            }
        SecurityContextHolder.getContext().authentication = authentication
    }

    private fun membership(tenantId: Long) =
        AuthenticatedUserTO.TenantMembershipInfo(
            tenantId = tenantId,
            tenantName = "tenant-$tenantId",
            tenantDisplayName = null,
            roleNames = setOf("admin"),
            permissionNames = setOf("business:product:read"),
        )
}
