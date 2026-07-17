package org.abacusflow.usecase.user

import java.time.Instant

data class RoleTO(
    val id: Long,
    val name: String,
    val label: String,
    val permissionNames: List<String>,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class CreateRoleInputTO(
    val name: String,
    val label: String?,
    val permissionIds: List<Long>,
)

data class UpdateRoleInputTO(
    val label: String?,
    val permissionIds: List<Long>,
)
