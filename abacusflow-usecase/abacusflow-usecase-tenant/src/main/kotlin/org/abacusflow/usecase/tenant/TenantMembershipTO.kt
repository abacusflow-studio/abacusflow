package org.abacusflow.usecase.tenant

data class TenantMembershipTO(
    val id: Long,
    val tenantId: Long,
    val userId: Long,
    val status: String,
    val roleNames: List<String>,
)
