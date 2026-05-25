package org.abacusflow.usecase.user

data class BootstrapResultTO(
    val userId: Long,
    val status: UserStatus,
    val enabled: Boolean,
    val locked: Boolean,
    val roles: List<String>,
    val permissions: List<String>,
    val email: String?,
    val displayName: String?,
    val pictureUrl: String?,
) {
    enum class UserStatus {
        ACTIVE,
        LOCKED,
    }
}
