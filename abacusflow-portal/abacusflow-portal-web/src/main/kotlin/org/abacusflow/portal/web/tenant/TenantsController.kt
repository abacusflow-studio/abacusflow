package org.abacusflow.portal.web.tenant

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.portal.web.api.TenantApi
import org.abacusflow.portal.web.authentication.AbacusFlowAuthenticationDetails
import org.abacusflow.portal.web.model.CreateTenantInvitationInputVO
import org.abacusflow.portal.web.model.CreateTenantRoleInputVO
import org.abacusflow.portal.web.model.PermissionVO
import org.abacusflow.portal.web.model.TenantDetailVO
import org.abacusflow.portal.web.model.TenantInvitationVO
import org.abacusflow.portal.web.model.TenantMemberVO
import org.abacusflow.portal.web.model.TenantRoleVO
import org.abacusflow.portal.web.model.UpdateMemberRolesInputVO
import org.abacusflow.portal.web.model.UpdateTenantInputVO
import org.abacusflow.portal.web.model.UpdateTenantRoleInputVO
import org.abacusflow.portal.web.user.toDetailVO
import org.abacusflow.portal.web.user.toMemberVO
import org.abacusflow.portal.web.user.toPermissionVO
import org.abacusflow.portal.web.user.toTenantRoleVO
import org.abacusflow.usecase.tenant.service.TenantCommandService
import org.abacusflow.usecase.tenant.service.TenantInvitationService
import org.abacusflow.usecase.tenant.service.TenantMembershipService
import org.abacusflow.usecase.tenant.service.TenantQueryService
import org.abacusflow.usecase.user.CreateTenantRoleInputTO
import org.abacusflow.usecase.user.UpdateTenantRoleInputTO
import org.abacusflow.usecase.user.service.TenantRoleCommandService
import org.abacusflow.usecase.user.service.TenantRoleQueryService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.web.bind.annotation.RestController

@RestController
class TenantsController(
    private val tenantCommandService: TenantCommandService,
    private val tenantQueryService: TenantQueryService,
    private val tenantMembershipService: TenantMembershipService,
    private val tenantInvitationService: TenantInvitationService,
    private val roleQueryService: TenantRoleQueryService,
    private val roleCommandService: TenantRoleCommandService,
    private val currentTenantProvider: CurrentTenantProvider,
) : TenantApi {
    override fun getCurrentTenant(): ResponseEntity<TenantDetailVO> {
        val tenantId = currentTenantProvider.requireTenantId()
        val summary =
            tenantQueryService.listTenantsForUser(currentDetails().userId)
                .find { it.tenantId == tenantId }
                ?: return ResponseEntity.status(403).build()
        return ResponseEntity.ok(
            tenantQueryService.getTenant(tenantId).toDetailVO(summary.roleNames, summary.permissionNames),
        )
    }

    override fun updateCurrentTenant(updateTenantInputVO: UpdateTenantInputVO): ResponseEntity<TenantDetailVO> {
        val tenantId = currentTenantProvider.requireTenantId()
        val updated = tenantCommandService.updateOwnTenant(tenantId, updateTenantInputVO.displayName)
        val summary =
            tenantQueryService.listTenantsForUser(currentDetails().userId)
                .first { it.tenantId == tenantId }
        return ResponseEntity.ok(updated.toDetailVO(summary.roleNames, summary.permissionNames))
    }

    override fun listTenantMembers(): ResponseEntity<List<TenantMemberVO>> {
        val tenantId = currentTenantProvider.requireTenantId()
        return ResponseEntity.ok(tenantMembershipService.listMembers(tenantId).map { it.toMemberVO() })
    }

    override fun removeTenantMember(membershipId: Long): ResponseEntity<Unit> {
        val tenantId = currentTenantProvider.requireTenantId()
        val membership =
            tenantMembershipService.listMembers(tenantId).find { it.id == membershipId }
                ?: return ResponseEntity.notFound().build()
        tenantMembershipService.removeMember(tenantId, membership.userId)
        return ResponseEntity.ok().build()
    }

    override fun updateMemberRoles(
        membershipId: Long,
        updateMemberRolesInputVO: UpdateMemberRolesInputVO,
    ): ResponseEntity<TenantMemberVO> =
        ResponseEntity.ok(
            tenantMembershipService.updateMemberRoles(membershipId, updateMemberRolesInputVO.roleIds).toMemberVO(),
        )

    override fun createTenantInvitation(createTenantInvitationInputVO: CreateTenantInvitationInputVO): ResponseEntity<TenantInvitationVO> {
        val invitation =
            tenantInvitationService.createInvitation(
                tenantId = currentTenantProvider.requireTenantId(),
                email = createTenantInvitationInputVO.email,
                roleIds = createTenantInvitationInputVO.roleIds ?: emptyList(),
                invitedByUserId = currentDetails().userId,
            )
        return ResponseEntity.status(201).body(invitation.toVO(includeToken = true))
    }

    override fun listTenantInvitations(): ResponseEntity<List<TenantInvitationVO>> =
        ResponseEntity.ok(
            tenantInvitationService.listInvitations(currentTenantProvider.requireTenantId()).map { it.toVO() },
        )

    override fun cancelTenantInvitation(invitationId: Long): ResponseEntity<Unit> {
        tenantInvitationService.cancelInvitation(invitationId)
        return ResponseEntity.ok().build()
    }

    override fun listTenantRoles(): ResponseEntity<List<TenantRoleVO>> =
        ResponseEntity.ok(roleQueryService.listRoles().map { it.toTenantRoleVO() })

    override fun getTenantRole(roleId: Long): ResponseEntity<TenantRoleVO> =
        ResponseEntity.ok(roleQueryService.getRole(roleId).toTenantRoleVO())

    override fun listTenantRolePermissions(): ResponseEntity<List<PermissionVO>> =
        ResponseEntity.ok(roleQueryService.listTenantAssignablePermissions().map { it.toPermissionVO() })

    override fun createTenantRole(createTenantRoleInputVO: CreateTenantRoleInputVO): ResponseEntity<TenantRoleVO> {
        val role =
            roleCommandService.createRole(
                CreateTenantRoleInputTO(
                    name = createTenantRoleInputVO.name,
                    label = createTenantRoleInputVO.label,
                    permissionIds = createTenantRoleInputVO.permissionIds ?: emptyList(),
                ),
            )
        return ResponseEntity.status(201).body(role.toTenantRoleVO())
    }

    override fun updateTenantRole(
        roleId: Long,
        updateTenantRoleInputVO: UpdateTenantRoleInputVO,
    ): ResponseEntity<TenantRoleVO> {
        val role =
            roleCommandService.updateRole(
                roleId,
                UpdateTenantRoleInputTO(
                    label = updateTenantRoleInputVO.label,
                    permissionIds = updateTenantRoleInputVO.permissionIds ?: emptyList(),
                ),
            )
        return ResponseEntity.ok(role.toTenantRoleVO())
    }

    override fun deleteTenantRole(roleId: Long): ResponseEntity<Unit> {
        roleCommandService.deleteRole(roleId)
        return ResponseEntity.ok().build()
    }

    private fun currentDetails(): AbacusFlowAuthenticationDetails {
        val authentication = SecurityContextHolder.getContext().authentication as JwtAuthenticationToken
        return authentication.details as AbacusFlowAuthenticationDetails
    }
}
