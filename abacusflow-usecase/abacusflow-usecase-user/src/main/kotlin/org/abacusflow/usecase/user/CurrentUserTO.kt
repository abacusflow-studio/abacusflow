package org.abacusflow.usecase.user

data class CurrentUserTO(
    val userId: Long,
    val username: String,
    val email: String?,
    val displayName: String?,
    val pictureUrl: String?,
    val enabled: Boolean,
    val locked: Boolean,
    val roles: List<String>,
    val permissions: List<String>,
)
