package org.abacusflow.usecase.tenant.mapper

import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.usecase.tenant.TenantMembershipTO
import org.abacusflow.usecase.tenant.TenantSummaryTO
import org.abacusflow.usecase.tenant.TenantTO

fun Tenant.toTO() = TenantTO(
    id = id,
    name = name,
    displayName = displayName,
    status = status.name,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun TenantMembership.toTO(userName: String = "Unknown User") = TenantMembershipTO(
    id = id,
    tenantId = tenantId,
    userId = userId,
    userName = userName,
    status = status.name,
    roleNames = roles.map { it.name },
)

fun TenantMembership.toSummaryTO(tenant: Tenant) = TenantSummaryTO(
    tenantId = tenant.id,
    name = tenant.name,
    displayName = tenant.displayName,
    roleNames = roles.map { it.name },
    permissionNames = roles.flatMap { it.permissions }.map { it.name }.distinct(),
)
