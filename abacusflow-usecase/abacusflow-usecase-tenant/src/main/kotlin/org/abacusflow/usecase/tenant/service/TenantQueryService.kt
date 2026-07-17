package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.tenant.TenantSummaryTO
import org.abacusflow.usecase.tenant.TenantTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantQueryService {
    @PreAuthorize("hasAuthority('tenant:info:read')")
    fun getTenant(tenantId: Long): TenantTO

    /**
     * List tenants that the given user is a member of.
     * No permission check — this only returns the user's own tenants for membership validation.
     */
    fun listTenantsForUser(userId: Long): List<TenantSummaryTO>

    /**
     * List all tenants visible to the current user (platform-level).
     * Currently delegates to listTenantsForUser, but with platform:tenant:list permission gate.
     */
    @PreAuthorize("hasAuthority('platform:tenant:list')")
    fun listTenants(userId: Long): List<TenantSummaryTO>
}
