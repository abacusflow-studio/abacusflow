package org.abacusflow.usecase.user

data class PlatformRoleTO(
    val id: Long,
    val name: String,
    val label: String,
    val permissionNames: List<String>,
)

data class PlatformRoleInputTO(
    val name: String,
    val label: String?,
    val permissionIds: List<Long>,
)

data class PlatformRoleAssignmentTO(
    val userId: Long,
    val userName: String,
    val roleId: Long,
    val roleName: String,
)
