package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.tenant.TenantSummaryTO
import org.abacusflow.usecase.tenant.TenantTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantQueryService {
    @PreAuthorize(RequiredAuthority.TENANT_PROFILE_READ)
    fun getTenant(tenantId: Long): TenantTO

    /**
     * List tenants that the given user is a member of.
     * No permission check — this only returns the user's own tenants for membership validation.
     */
    fun listTenantsForUser(userId: Long): List<TenantSummaryTO>

    /** 全局控制面租户目录，不包含成员角色或业务权限。 */
    @PreAuthorize(RequiredAuthority.PLATFORM_TENANT_LIST)
    fun listPlatformTenants(): List<TenantTO>
}
