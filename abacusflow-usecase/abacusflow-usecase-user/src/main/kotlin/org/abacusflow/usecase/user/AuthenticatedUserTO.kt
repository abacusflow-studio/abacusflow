package org.abacusflow.usecase.user

data class AuthenticatedUserTO(
    val id: Long,
    val name: String,
    val roleNames: Set<String>,
    val permissionNames: Set<String>,
    val tenantMemberships: List<TenantMembershipInfo> = emptyList(),
) {
    data class TenantMembershipInfo(
        val tenantId: Long,
        val tenantName: String,
        val tenantDisplayName: String?,
        val roleNames: Set<String>,
        val permissionNames: Set<String>,
    )
}
