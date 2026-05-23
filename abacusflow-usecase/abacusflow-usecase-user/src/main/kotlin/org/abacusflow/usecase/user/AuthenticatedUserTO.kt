package org.abacusflow.usecase.user

data class AuthenticatedUserTO(
    val id: Long,
    val name: String,
    val roleNames: Set<String>,
    val permissionNames: Set<String>,
)
