package org.abacusflow.portal.web.tenant

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.portal.web.authentication.AbacusFlowAuthenticationDetails
import org.abacusflow.portal.web.authentication.TenantAuthorityBuilder
import org.abacusflow.usecase.tenant.service.TenantAccessService
import org.slf4j.LoggerFactory
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class TenantContextFilter(
    private val currentTenantProvider: CurrentTenantProvider,
    private val tenantAccessService: TenantAccessService,
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

            val tenantIdHeader = request.getHeader("X-Tenant-Id")
            if (tenantIdHeader != null) {
                val tenantId = tenantIdHeader.toLongOrNull()
                if (tenantId == null) {
                    response.sendError(400, "Invalid X-Tenant-Id header")
                    return
                }

                val userId = details?.userId
                if (userId != null && !tenantAccessService.userHasAccessToTenant(userId, tenantId)) {
                    response.sendError(403, "User does not have access to tenant $tenantId")
                    return
                }

                currentTenantProvider.setTenantId(tenantId)

                // Update Spring Security authorities based on the selected tenant's roles/permissions
                updateAuthoritiesForTenant(authentication, details, tenantId)
            } else {
                // No X-Tenant-Id header: if user has a single tenant, auto-set it
                autoSelectSingleTenant(authentication, details)
            }
            filterChain.doFilter(request, response)
        } finally {
            currentTenantProvider.clear()
        }
    }

    private fun updateAuthoritiesForTenant(
        authentication: JwtAuthenticationToken?,
        details: AbacusFlowAuthenticationDetails?,
        tenantId: Long,
    ) {
        if (authentication == null || details == null) {
            log.warn("Cannot update authorities: no authenticated user details available for tenant $tenantId")
            return
        }

        val selectedMembership = details.tenantMemberships.find { it.tenantId == tenantId }
        if (selectedMembership == null) {
            log.warn("User ${details.userId} has no membership for tenant $tenantId — authorities not updated")
            return
        }

        val authorities = TenantAuthorityBuilder.buildAuthorities(
            selectedMembership.roleNames,
            selectedMembership.permissionNames,
        )
        replaceAuthorities(authentication, authorities)
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

            // If the current authorities are empty (multi-tenant user got empty at JWT level),
            // update them with the single tenant's roles/permissions
            if (authentication.authorities.isEmpty()) {
                val authorities = TenantAuthorityBuilder.buildAuthorities(
                    membership.roleNames,
                    membership.permissionNames,
                )
                replaceAuthorities(authentication, authorities)
            }
        } else if (memberships.size > 1) {
            log.debug("User ${details.userId} has ${memberships.size} tenants but no X-Tenant-Id header — no tenant selected")
        }
    }

    private fun replaceAuthorities(
        authentication: JwtAuthenticationToken,
        authorities: Set<GrantedAuthority>,
    ) {
        val newAuthentication = JwtAuthenticationToken(
            authentication.token,
            authorities,
            authentication.name,
        ).apply {
            setDetails(authentication.details)
        }
        SecurityContextHolder.getContext().authentication = newAuthentication
    }
}
