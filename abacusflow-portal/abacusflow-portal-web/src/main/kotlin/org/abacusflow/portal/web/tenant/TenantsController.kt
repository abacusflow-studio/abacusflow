package org.abacusflow.portal.web.tenant

import org.abacusflow.portal.web.api.TenantsApi
import org.abacusflow.portal.web.authentication.AbacusFlowAuthenticationDetails
import org.abacusflow.portal.web.model.CreateTenantInputVO
import org.abacusflow.portal.web.model.TenantSummaryVO
import org.abacusflow.portal.web.user.toVO
import org.abacusflow.usecase.tenant.CreateTenantInputTO
import org.abacusflow.usecase.tenant.service.TenantCommandService
import org.abacusflow.usecase.tenant.service.TenantQueryService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.web.bind.annotation.RestController

@RestController
class TenantsController(
    private val tenantCommandService: TenantCommandService,
    private val tenantQueryService: TenantQueryService,
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

    override fun listTenants(): ResponseEntity<List<TenantSummaryVO>> {
        val userId = currentUserId()
        val tenantSummaries = tenantQueryService.listTenantsForUser(userId)
        return ResponseEntity.ok(tenantSummaries.map { it.toVO() })
    }

    private fun currentUserId(): Long {
        val authentication = SecurityContextHolder.getContext().authentication as JwtAuthenticationToken
        val details = authentication.details as AbacusFlowAuthenticationDetails
        return details.userId
    }
}
