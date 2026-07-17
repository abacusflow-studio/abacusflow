package org.abacusflow.usecase.tenant.mapper

import org.abacusflow.tenant.TenantInvitation
import org.abacusflow.usecase.tenant.TenantInvitationTO

fun TenantInvitation.toTO(
    tenantName: String = "",
    roleNames: List<String> = emptyList(),
) = TenantInvitationTO(
    id = id,
    tenantId = tenantId,
    tenantName = tenantName,
    email = email,
    roleIds = roleIds.toList(),
    roleNames = roleNames,
    invitedByUserId = invitedByUserId,
    token = token,
    status = status,
    expiresAt = expiresAt,
    acceptedAt = acceptedAt,
    createdAt = createdAt,
)
