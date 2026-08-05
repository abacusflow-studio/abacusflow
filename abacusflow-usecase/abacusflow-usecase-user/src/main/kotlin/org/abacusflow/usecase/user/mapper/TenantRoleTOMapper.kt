package org.abacusflow.usecase.user.mapper

import org.abacusflow.tenant.TenantRole
import org.abacusflow.usecase.user.PermissionTO
import org.abacusflow.usecase.user.TenantRoleTO
import org.abacusflow.user.Permission

fun TenantRole.toTO() =
    TenantRoleTO(
        id = id,
        name = name,
        label = label,
        permissionNames = permissions.map { it.name }.sorted(),
        createdAt = createdAt,
        updatedAt = updatedAt,
    )

fun Permission.toTO() =
    PermissionTO(
        id = id,
        name = name,
        label = label,
        description = description,
        scope = scope.name,
    )
