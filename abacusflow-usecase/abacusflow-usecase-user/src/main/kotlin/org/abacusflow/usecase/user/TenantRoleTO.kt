package org.abacusflow.usecase.user

import java.time.Instant

data class TenantRoleTO(
    val id: Long,
    val name: String,
    val label: String,
    val permissionNames: List<String>,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class CreateTenantRoleInputTO(
    val name: String,
    val label: String?,
    val permissionIds: List<Long>,
)

data class UpdateTenantRoleInputTO(
    val label: String?,
    val permissionIds: List<Long>,
)
