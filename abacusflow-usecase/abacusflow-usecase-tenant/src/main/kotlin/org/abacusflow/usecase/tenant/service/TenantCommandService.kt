package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.tenant.CreateTenantInputTO
import org.abacusflow.usecase.tenant.TenantTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantCommandService {
    @PreAuthorize("hasAuthority('platform:tenant:create')")
    fun createTenant(input: CreateTenantInputTO): TenantTO

    @PreAuthorize("hasAuthority('platform:tenant:update')")
    fun updateTenant(tenantId: Long, displayName: String?): TenantTO
}
