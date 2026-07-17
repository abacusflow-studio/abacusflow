package org.abacusflow.portal.web.user

import org.abacusflow.portal.web.model.BootstrapResultVO
import org.abacusflow.portal.web.model.CurrentUserVO
import org.abacusflow.portal.web.model.PermissionVO
import org.abacusflow.portal.web.model.RoleVO
import org.abacusflow.portal.web.model.TenantDetailVO
import org.abacusflow.portal.web.model.TenantMemberVO
import org.abacusflow.portal.web.model.TenantSummaryVO
import org.abacusflow.usecase.tenant.TenantMembershipTO
import org.abacusflow.usecase.tenant.TenantSummaryTO
import org.abacusflow.usecase.tenant.TenantTO
import org.abacusflow.usecase.user.BootstrapResultTO
import org.abacusflow.usecase.user.CurrentUserTO
import org.abacusflow.usecase.user.PermissionTO
import org.abacusflow.usecase.user.RoleTO

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

fun TenantMembershipTO.toMemberVO() =
    TenantMemberVO(
        id = id,
        tenantId = tenantId,
        userId = userId,
        userName = userName,
        status = TenantMemberVO.Status.forValue(status),
        roleNames = roleNames,
    )

fun RoleTO.toRoleVO() =
    RoleVO(
        id = id,
        name = name,
        label = label,
        permissionNames = permissionNames,
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli(),
    )

fun PermissionTO.toPermissionVO() =
    PermissionVO(
        id = id,
        name = name,
        label = label,
        description = description,
    )
