package org.abacusflow.usecase.tenant

data class TenantSummaryTO(
    val tenantId: Long,
    val name: String,
    val displayName: String?,
    val roleNames: List<String>,
    val permissionNames: List<String>,
)
