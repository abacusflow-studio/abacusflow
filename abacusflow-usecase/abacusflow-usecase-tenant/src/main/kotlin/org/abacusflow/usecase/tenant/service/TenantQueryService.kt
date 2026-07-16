package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.tenant.TenantSummaryTO
import org.abacusflow.usecase.tenant.TenantTO

interface TenantQueryService {
    fun getTenant(tenantId: Long): TenantTO
    fun listTenantsForUser(userId: Long): List<TenantSummaryTO>
}
