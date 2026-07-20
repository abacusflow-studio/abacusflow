package org.abacusflow.usecase.tenant

/** One-time result. The invitation token is returned only by provisioning/reissue commands. */
data class TenantProvisioningTO(
    val tenant: TenantTO,
    val initialInvitation: TenantInvitationTO,
)
