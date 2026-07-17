package org.abacusflow.portal.web.tenant

import org.abacusflow.portal.web.model.TenantInvitationVO
import org.abacusflow.usecase.tenant.TenantInvitationTO

fun TenantInvitationTO.toVO() = TenantInvitationVO(
    id = id,
    tenantId = tenantId,
    tenantName = tenantName,
    email = email,
    roleIds = roleIds,
    roleNames = roleNames,
    invitedByUserId = invitedByUserId,
    token = token,
    status = TenantInvitationVO.Status.valueOf(status),
    expiresAt = expiresAt.toEpochMilli(),
    acceptedAt = acceptedAt?.toEpochMilli(),
    createdAt = createdAt.toEpochMilli(),
)
