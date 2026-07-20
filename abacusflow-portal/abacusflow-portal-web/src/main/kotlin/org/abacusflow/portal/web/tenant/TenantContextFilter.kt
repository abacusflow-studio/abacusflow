package org.abacusflow.portal.web.tenant

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.portal.web.authentication.AbacusFlowAuthenticationDetails
import org.abacusflow.portal.web.authentication.TenantAuthorityBuilder
import org.slf4j.LoggerFactory
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class TenantContextFilter(
    private val currentTenantProvider: CurrentTenantProvider,
) : OncePerRequestFilter() {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        try {
            val authentication = SecurityContextHolder.getContext().authentication as? JwtAuthenticationToken
            val details = authentication?.details as? AbacusFlowAuthenticationDetails
            val tenantContextRequired = requiresTenantContext(request)

            val tenantIdValue = request.getHeader("X-Tenant-Id")
            if (tenantIdValue != null) {
                val tenantId = tenantIdValue.toLongOrNull()
                if (tenantId == null) {
                    if (tenantContextRequired) {
                        response.sendError(400, "Invalid tenant ID: $tenantIdValue")
                        return
                    }
                    log.debug("Ignoring malformed cached tenant ID on tenant-neutral path: $tenantIdValue")
                    autoSelectSingleTenant(authentication, details)
                } else if (details == null) {
                    if (authentication != null && tenantContextRequired) {
                        log.warn("Authenticated request has no AbacusFlow tenant details")
                        response.sendError(403, "User does not have access to tenant $tenantId")
                        return
                    }
                } else {
                    val selectedMembership = details.tenantMemberships.find { it.tenantId == tenantId }
                    if (selectedMembership == null) {
                        if (tenantContextRequired) {
                            log.warn("User ${details.userId} attempted to access tenant $tenantId which is not in their memberships")
                            response.sendError(403, "User does not have access to tenant $tenantId")
                            return
                        }
                        log.debug("Ignoring stale tenant $tenantId for user ${details.userId} on tenant-neutral path")
                        autoSelectSingleTenant(authentication, details)
                    } else {
                        currentTenantProvider.setTenantId(tenantId)

                        val authorities = buildEffectiveAuthorities(details, selectedMembership)
                        replaceAuthorities(authentication, authorities, tenantId)
                    }
                }
            } else {
                // No tenant ID specified: if user has a single tenant, auto-set it
                autoSelectSingleTenant(authentication, details)
            }
            if (details != null && currentTenantProvider.getCurrentTenantId() == null && tenantContextRequired) {
                if (details.tenantMemberships.isEmpty()) {
                    response.sendError(403, "User does not have access to an active tenant")
                } else {
                    response.sendError(400, "X-Tenant-Id header is required for this endpoint")
                }
                return
            }
            filterChain.doFilter(request, response)
        } finally {
            currentTenantProvider.clear()
        }
    }

    private fun autoSelectSingleTenant(
        authentication: JwtAuthenticationToken?,
        details: AbacusFlowAuthenticationDetails?,
    ) {
        if (authentication == null || details == null) return

        val memberships = details.tenantMemberships
        if (memberships.size == 1) {
            val membership = memberships[0]
            currentTenantProvider.setTenantId(membership.tenantId)

            val authorities = buildEffectiveAuthorities(details, membership)
            replaceAuthorities(authentication, authorities, membership.tenantId)
        } else if (memberships.size > 1) {
            log.debug("User ${details.userId} has ${memberships.size} tenants but no tenant selected — no tenant context set")
        }
    }

    private fun replaceAuthorities(
        authentication: JwtAuthenticationToken,
        authorities: Set<GrantedAuthority>,
        tenantId: Long,
    ) {
        val originalDetails = authentication.details as? AbacusFlowAuthenticationDetails
        val updatedDetails = originalDetails?.copy(selectedTenantId = tenantId)
        val newAuthentication =
            JwtAuthenticationToken(
                authentication.token,
                authorities,
                authentication.name,
            ).apply {
                setDetails(updatedDetails ?: authentication.details)
            }
        SecurityContextHolder.getContext().authentication = newAuthentication
    }

    private fun buildEffectiveAuthorities(
        details: AbacusFlowAuthenticationDetails,
        membership: org.abacusflow.usecase.user.AuthenticatedUserTO.TenantMembershipInfo,
    ): Set<GrantedAuthority> =
        TenantAuthorityBuilder.buildAuthorities(
            details.platformRoleNames,
            details.platformPermissionNames,
        ) +
            TenantAuthorityBuilder.buildAuthorities(
                membership.roleNames,
                membership.permissionNames,
            )

    private fun requiresTenantContext(request: HttpServletRequest): Boolean {
        val path = (request.requestURI ?: "").removePrefix(request.contextPath ?: "")
        val candidatePaths = if (path.startsWith("/api/")) listOf(path, path.removePrefix("/api")) else listOf(path)
        return candidatePaths.any { candidatePath ->
            TENANT_SCOPED_PATH_PREFIXES.any { prefix ->
                candidatePath == prefix || candidatePath.startsWith("$prefix/")
            }
        }
    }

    companion object {
        private val TENANT_SCOPED_PATH_PREFIXES =
            listOf(
                "/tenant",
                "/suppliers",
                "/customers",
                "/products",
                "/product-categories",
                "/depots",
                "/inventories",
                "/inventory-units",
                "/sale-orders",
                "/purchase-orders",
                "/feedback",
                "/files",
                "/api/cube-token",
            )
    }
}
