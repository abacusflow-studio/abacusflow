package org.abacusflow.portal.web.user

import org.abacusflow.portal.web.model.BootstrapResultVO
import org.abacusflow.portal.web.model.CurrentUserVO
import org.abacusflow.portal.web.model.TenantDetailVO
import org.abacusflow.portal.web.model.TenantSummaryVO
import org.abacusflow.usecase.tenant.TenantSummaryTO
import org.abacusflow.usecase.tenant.TenantTO
import org.abacusflow.usecase.user.BootstrapResultTO
import org.abacusflow.usecase.user.CurrentUserTO

fun BootstrapResultTO.toVO() =
    BootstrapResultVO(
        userId = userId,
        status = BootstrapResultVO.Status.forValue(status.name),
        enabled = enabled,
        locked = locked,
        roles = roles,
        permissions = permissions,
        email = email,
        displayName = displayName,
        pictureUrl = pictureUrl,
        tenantStatus = BootstrapResultVO.TenantStatus.forValue(tenantStatus.name),
        tenants = tenants.map { it.toVO() },
        currentTenantId = currentTenantId,
    )

fun TenantSummaryTO.toVO() =
    TenantSummaryVO(
        tenantId = tenantId,
        name = name,
        displayName = displayName,
        roleNames = roleNames,
        permissionNames = permissionNames,
    )

fun TenantTO.toDetailVO(roleNames: List<String>, permissionNames: List<String>) =
    TenantDetailVO(
        tenantId = id,
        name = name,
        displayName = displayName,
        status = TenantDetailVO.Status.forValue(status),
        roleNames = roleNames,
        permissionNames = permissionNames,
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli(),
    )

fun CurrentUserTO.toVO() =
    CurrentUserVO(
        userId = userId,
        username = username,
        email = email,
        displayName = displayName,
        pictureUrl = pictureUrl,
        enabled = enabled,
        locked = locked,
        roles = roles,
        permissions = permissions,
        tenantStatus = CurrentUserVO.TenantStatus.forValue(tenantStatus.name),
        tenants = tenants.map { it.toVO() },
        currentTenantId = currentTenantId,
    )
