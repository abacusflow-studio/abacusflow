package org.abacusflow.portal.web.tenant

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.portal.web.api.TenantsApi
import org.abacusflow.portal.web.authentication.AbacusFlowAuthenticationDetails
import org.abacusflow.portal.web.model.AddTenantMemberInputVO
import org.abacusflow.portal.web.model.CreateTenantInputVO
import org.abacusflow.portal.web.model.TenantDetailVO
import org.abacusflow.portal.web.model.TenantMemberVO
import org.abacusflow.portal.web.model.TenantSummaryVO
import org.abacusflow.portal.web.model.UpdateMemberRolesInputVO
import org.abacusflow.portal.web.model.UpdateTenantInputVO
import org.abacusflow.portal.web.user.toDetailVO
import org.abacusflow.portal.web.user.toMemberVO
import org.abacusflow.portal.web.user.toVO
import org.abacusflow.usecase.tenant.CreateTenantInputTO
import org.abacusflow.usecase.tenant.service.TenantCommandService
import org.abacusflow.usecase.tenant.service.TenantMembershipService
import org.abacusflow.usecase.tenant.service.TenantQueryService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.web.bind.annotation.RestController

@RestController
class TenantsController(
    private val tenantCommandService: TenantCommandService,
    private val tenantQueryService: TenantQueryService,
    private val tenantMembershipService: TenantMembershipService,
    private val currentTenantProvider: CurrentTenantProvider,
) : TenantsApi {

    override fun createTenant(createTenantInputVO: CreateTenantInputVO): ResponseEntity<TenantSummaryVO> {
        val userId = currentUserId()

        tenantCommandService.createTenant(
            CreateTenantInputTO(
                name = createTenantInputVO.name,
                displayName = createTenantInputVO.displayName,
                ownerUserId = userId,
            ),
        )

        // Query the newly created tenant summary (includes roles/permissions from membership)
        val tenantSummaries = tenantQueryService.listTenantsForUser(userId)
        val newTenantSummary = tenantSummaries.first { it.name == createTenantInputVO.name }

        return ResponseEntity.status(201).body(newTenantSummary.toVO())
    }

    override fun getTenant(tenantId: Long): ResponseEntity<TenantDetailVO> {
        val userId = currentUserId()

        // Verify the user is a member of this tenant
        val memberships = tenantQueryService.listTenantsForUser(userId)
        val membership = memberships.find { it.tenantId == tenantId }
            ?: return ResponseEntity.status(403).build()

        val tenant = tenantQueryService.getTenant(tenantId)
        return ResponseEntity.ok(tenant.toDetailVO(membership.roleNames, membership.permissionNames))
    }

    override fun updateTenant(tenantId: Long, updateTenantInputVO: UpdateTenantInputVO): ResponseEntity<TenantDetailVO> {
        val userId = currentUserId()

        // Verify the user is a member
        val memberships = tenantQueryService.listTenantsForUser(userId)
        val membership = memberships.find { it.tenantId == tenantId }
            ?: return ResponseEntity.status(403).build()

        val updated = tenantCommandService.updateTenant(tenantId, updateTenantInputVO.displayName)
        return ResponseEntity.ok(updated.toDetailVO(membership.roleNames, membership.permissionNames))
    }

    override fun listTenants(): ResponseEntity<List<TenantSummaryVO>> {
        val userId = currentUserId()
        val tenantSummaries = tenantQueryService.listTenants(userId)
        return ResponseEntity.ok(tenantSummaries.map { it.toVO() })
    }

    override fun listTenantMembers(): ResponseEntity<List<TenantMemberVO>> {
        val tenantId = currentTenantProvider.requireTenantId()
        val members = tenantMembershipService.listMembers(tenantId)
        return ResponseEntity.ok(members.map { it.toMemberVO() })
    }

    override fun addTenantMember(addTenantMemberInputVO: AddTenantMemberInputVO): ResponseEntity<TenantMemberVO> {
        val tenantId = currentTenantProvider.requireTenantId()
        val member = tenantMembershipService.addMember(
            tenantId = tenantId,
            userId = addTenantMemberInputVO.userId,
            roleIds = addTenantMemberInputVO.roleIds ?: emptyList(),
        )
        return ResponseEntity.status(201).body(member.toMemberVO())
    }

    override fun removeTenantMember(membershipId: Long): ResponseEntity<Unit> {
        val tenantId = currentTenantProvider.requireTenantId()
        // Find the membership to get the userId
        val members = tenantMembershipService.listMembers(tenantId)
        val membership = members.find { it.id == membershipId }
            ?: return ResponseEntity.status(404).build()
        tenantMembershipService.removeMember(tenantId = tenantId, userId = membership.userId)
        return ResponseEntity.ok().build()
    }

    override fun updateMemberRoles(
        membershipId: Long,
        updateMemberRolesInputVO: UpdateMemberRolesInputVO,
    ): ResponseEntity<TenantMemberVO> {
        val updated = tenantMembershipService.updateMemberRoles(membershipId, updateMemberRolesInputVO.roleIds)
        return ResponseEntity.ok(updated.toMemberVO())
    }

    private fun currentUserId(): Long {
        val authentication = SecurityContextHolder.getContext().authentication as JwtAuthenticationToken
        val details = authentication.details as AbacusFlowAuthenticationDetails
        return details.userId
    }
}
