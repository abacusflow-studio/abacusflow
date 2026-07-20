package org.abacusflow.usecase.tenant

data class CreateTenantInputTO(
    val name: String,
    val displayName: String?,
    val initialAdministratorEmail: String,
    val createdByUserId: Long,
)
