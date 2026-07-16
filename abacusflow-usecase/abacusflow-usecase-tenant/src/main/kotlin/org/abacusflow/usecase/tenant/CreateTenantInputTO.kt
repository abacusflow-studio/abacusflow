package org.abacusflow.usecase.tenant

data class CreateTenantInputTO(
    val name: String,
    val displayName: String?,
    val ownerUserId: Long,
)
