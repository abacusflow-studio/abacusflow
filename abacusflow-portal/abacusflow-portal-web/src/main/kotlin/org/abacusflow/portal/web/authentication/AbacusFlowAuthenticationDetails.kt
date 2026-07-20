package org.abacusflow.portal.web.authentication

import org.abacusflow.usecase.user.AuthenticatedUserTO

data class AbacusFlowAuthenticationDetails(
    val userId: Long,
    val tenantMemberships: List<AuthenticatedUserTO.TenantMembershipInfo>,
    val platformRoleNames: Set<String> = emptySet(),
    val platformPermissionNames: Set<String> = emptySet(),
    val email: String? = null,
    val emailVerified: Boolean = false,
    val selectedTenantId: Long? = null,
)
