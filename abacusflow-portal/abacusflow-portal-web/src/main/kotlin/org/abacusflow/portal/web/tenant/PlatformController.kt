package org.abacusflow.portal.web.tenant

import org.abacusflow.portal.web.api.PlatformApi
import org.abacusflow.portal.web.authentication.AbacusFlowAuthenticationDetails
import org.abacusflow.portal.web.model.CreateTenantInputVO
import org.abacusflow.portal.web.model.PermissionVO
import org.abacusflow.portal.web.model.PlatformRoleAssignmentVO
import org.abacusflow.portal.web.model.PlatformRoleInputVO
import org.abacusflow.portal.web.model.PlatformRoleVO
import org.abacusflow.portal.web.model.PlatformTenantVO
import org.abacusflow.portal.web.model.ReissueInitialInvitationInputVO
import org.abacusflow.portal.web.model.TenantInvitationVO
import org.abacusflow.portal.web.model.TenantProvisioningVO
import org.abacusflow.portal.web.model.UpdatePermissionInputVO
import org.abacusflow.portal.web.model.UpdateTenantInputVO
import org.abacusflow.portal.web.user.toPermissionVO
import org.abacusflow.usecase.tenant.CreateTenantInputTO
import org.abacusflow.usecase.tenant.TenantTO
import org.abacusflow.usecase.tenant.service.TenantCommandService
import org.abacusflow.usecase.tenant.service.TenantInvitationService
import org.abacusflow.usecase.tenant.service.TenantQueryService
import org.abacusflow.usecase.user.PlatformRoleAssignmentTO
import org.abacusflow.usecase.user.PlatformRoleInputTO
import org.abacusflow.usecase.user.PlatformRoleTO
import org.abacusflow.usecase.user.service.PermissionCommandService
import org.abacusflow.usecase.user.service.PlatformRoleService
import org.abacusflow.usecase.user.service.TenantRoleQueryService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.web.bind.annotation.RestController

@RestController
class PlatformController(
    private val roleQueryService: TenantRoleQueryService,
    private val permissionCommandService: PermissionCommandService,
    private val platformRoleService: PlatformRoleService,
    private val tenantQueryService: TenantQueryService,
    private val tenantCommandService: TenantCommandService,
    private val tenantInvitationService: TenantInvitationService,
) : PlatformApi {
    override fun listPermissions(): ResponseEntity<List<PermissionVO>> =
        ResponseEntity.ok(roleQueryService.listPermissions().map { it.toPermissionVO() })

    override fun updatePermission(
        permissionId: Long,
        updatePermissionInputVO: UpdatePermissionInputVO,
    ): ResponseEntity<PermissionVO> =
        ResponseEntity.ok(
            permissionCommandService.updatePermission(
                permissionId,
                updatePermissionInputVO.label,
                updatePermissionInputVO.description,
            ).toPermissionVO(),
        )

    override fun listPlatformRoles(): ResponseEntity<List<PlatformRoleVO>> =
        ResponseEntity.ok(platformRoleService.listRoles().map { it.toVO() })

    override fun listPlatformRoleAssignments(roleId: Long): ResponseEntity<List<PlatformRoleAssignmentVO>> =
        ResponseEntity.ok(platformRoleService.listAssignments(roleId).map { it.toVO() })

    override fun createPlatformRole(platformRoleInputVO: PlatformRoleInputVO): ResponseEntity<PlatformRoleVO> =
        ResponseEntity.status(201).body(
            platformRoleService.createRole(platformRoleInputVO.toTO()).toVO(),
        )

    override fun updatePlatformRole(
        roleId: Long,
        platformRoleInputVO: PlatformRoleInputVO,
    ): ResponseEntity<PlatformRoleVO> =
        ResponseEntity.ok(
            platformRoleService.updateRole(
                roleId,
                platformRoleInputVO.label,
                platformRoleInputVO.permissionIds,
            ).toVO(),
        )

    override fun deletePlatformRole(roleId: Long): ResponseEntity<Unit> {
        platformRoleService.deleteRole(roleId)
        return ResponseEntity.ok().build()
    }

    override fun assignPlatformRole(
        roleId: Long,
        userId: Long,
    ): ResponseEntity<PlatformRoleAssignmentVO> = ResponseEntity.status(201).body(platformRoleService.assignRole(userId, roleId).toVO())

    override fun removePlatformRole(
        roleId: Long,
        userId: Long,
    ): ResponseEntity<Unit> {
        platformRoleService.removeRole(userId, roleId)
        return ResponseEntity.ok().build()
    }

    override fun listPlatformTenants(): ResponseEntity<List<PlatformTenantVO>> =
        ResponseEntity.ok(tenantQueryService.listPlatformTenants().map { it.toPlatformVO() })

    override fun provisionTenant(createTenantInputVO: CreateTenantInputVO): ResponseEntity<TenantProvisioningVO> {
        val provisioned =
            tenantCommandService.createTenant(
                CreateTenantInputTO(
                    name = createTenantInputVO.name,
                    displayName = createTenantInputVO.displayName,
                    initialAdministratorEmail = createTenantInputVO.initialAdministratorEmail,
                    createdByUserId = currentDetails().userId,
                ),
            )
        return ResponseEntity.status(201).body(
            TenantProvisioningVO(
                tenant = provisioned.tenant.toPlatformVO(),
                initialInvitation = provisioned.initialInvitation.toVO(includeToken = true),
            ),
        )
    }

    override fun updatePlatformTenant(
        tenantId: Long,
        updateTenantInputVO: UpdateTenantInputVO,
    ): ResponseEntity<PlatformTenantVO> =
        ResponseEntity.ok(
            tenantCommandService.updateTenant(tenantId, updateTenantInputVO.displayName).toPlatformVO(),
        )

    override fun reissueInitialTenantInvitation(
        tenantId: Long,
        reissueInitialInvitationInputVO: ReissueInitialInvitationInputVO,
    ): ResponseEntity<TenantInvitationVO> =
        ResponseEntity.ok(
            tenantInvitationService.reissueInitialInvitation(
                tenantId,
                reissueInitialInvitationInputVO.email,
                currentDetails().userId,
            ).toVO(includeToken = true),
        )

    private fun currentDetails(): AbacusFlowAuthenticationDetails {
        val authentication = SecurityContextHolder.getContext().authentication as JwtAuthenticationToken
        return authentication.details as AbacusFlowAuthenticationDetails
    }
}

private fun PlatformRoleInputVO.toTO() = PlatformRoleInputTO(name, label, permissionIds)

private fun PlatformRoleTO.toVO() = PlatformRoleVO(id, name, label, permissionNames)

private fun PlatformRoleAssignmentTO.toVO() = PlatformRoleAssignmentVO(userId, userName, roleId, roleName)

private fun TenantTO.toPlatformVO() =
    PlatformTenantVO(
        id = id,
        name = name,
        status = PlatformTenantVO.Status.forValue(status),
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli(),
        displayName = displayName,
    )
