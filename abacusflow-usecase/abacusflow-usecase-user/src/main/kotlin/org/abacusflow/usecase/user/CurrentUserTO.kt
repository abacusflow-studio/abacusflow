package org.abacusflow.usecase.user

import org.abacusflow.usecase.tenant.TenantSelectionStatus
import org.abacusflow.usecase.tenant.TenantSummaryTO

data class CurrentUserTO(
    val userId: Long,
    val username: String,
    val email: String?,
    val displayName: String?,
    val pictureUrl: String?,
    val enabled: Boolean,
    val locked: Boolean,
    val roles: List<String>,
    val permissions: List<String>,
    val platformPermissions: List<String>,
    val tenantPermissions: List<String>,
    val tenantStatus: TenantSelectionStatus,
    val tenants: List<TenantSummaryTO>,
    val currentTenantId: Long?,
)
