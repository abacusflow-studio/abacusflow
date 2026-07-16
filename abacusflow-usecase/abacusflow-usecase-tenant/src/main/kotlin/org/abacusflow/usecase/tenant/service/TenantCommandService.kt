package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.tenant.CreateTenantInputTO
import org.abacusflow.usecase.tenant.TenantTO

interface TenantCommandService {
    fun createTenant(input: CreateTenantInputTO): TenantTO
    fun updateTenant(tenantId: Long, displayName: String?): TenantTO
}
