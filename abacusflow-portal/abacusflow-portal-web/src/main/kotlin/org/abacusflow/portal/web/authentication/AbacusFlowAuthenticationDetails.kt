package org.abacusflow.portal.web.authentication

import org.abacusflow.usecase.user.AuthenticatedUserTO

data class AbacusFlowAuthenticationDetails(
    val userId: Long,
    val tenantMemberships: List<AuthenticatedUserTO.TenantMembershipInfo>,
    val selectedTenantId: Long? = null,
)
