package org.abacusflow.usecase.user

import org.abacusflow.usecase.tenant.TenantSelectionStatus
import org.abacusflow.usecase.tenant.TenantSummaryTO

data class BootstrapResultTO(
    val userId: Long,
    val status: UserStatus,
    val enabled: Boolean,
    val locked: Boolean,
    val roles: List<String>,
    val permissions: List<String>,
    val platformPermissions: List<String>,
    val tenantPermissions: List<String>,
    val email: String?,
    val displayName: String?,
    val pictureUrl: String?,
    val tenantStatus: TenantSelectionStatus,
    val tenants: List<TenantSummaryTO>,
    val currentTenantId: Long?,
) {
    enum class UserStatus {
        ACTIVE,
        LOCKED,
    }
}
