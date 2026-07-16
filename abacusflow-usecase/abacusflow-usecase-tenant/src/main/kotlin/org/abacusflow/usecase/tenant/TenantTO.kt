package org.abacusflow.usecase.tenant

data class TenantTO(
    val id: Long,
    val name: String,
    val displayName: String?,
    val status: String,
)
