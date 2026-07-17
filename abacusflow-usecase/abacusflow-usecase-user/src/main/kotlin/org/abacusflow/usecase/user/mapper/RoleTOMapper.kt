package org.abacusflow.usecase.user.mapper

import org.abacusflow.usecase.user.PermissionTO
import org.abacusflow.usecase.user.RoleTO
import org.abacusflow.user.Permission
import org.abacusflow.user.Role

fun Role.toTO() = RoleTO(
    id = id,
    name = name,
    label = label,
    permissionNames = permissions.map { it.name }.sorted(),
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun Permission.toTO() = PermissionTO(
    id = id,
    name = name,
    label = label,
    description = description,
)
