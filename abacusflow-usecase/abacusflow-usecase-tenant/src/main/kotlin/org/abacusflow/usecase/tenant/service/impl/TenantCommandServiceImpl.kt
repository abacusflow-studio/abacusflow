package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantPlacementRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.RoleRepository
import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.tenant.TenantPlacement
import org.abacusflow.usecase.tenant.CreateTenantInputTO
import org.abacusflow.usecase.tenant.TenantTO
import org.abacusflow.usecase.tenant.mapper.toTO
import org.abacusflow.usecase.tenant.service.TenantCommandService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class TenantCommandServiceImpl(
    private val tenantRepository: TenantRepository,
    private val tenantMembershipRepository: TenantMembershipRepository,
    private val tenantPlacementRepository: TenantPlacementRepository,
    private val roleRepository: RoleRepository,
) : TenantCommandService {

    override fun createTenant(input: CreateTenantInputTO): TenantTO {
        require(!tenantRepository.existsByName(input.name)) { "Tenant name '${input.name}' already exists" }

        val tenant = Tenant(name = input.name).apply {
            updateProfile(input.displayName)
        }
        val savedTenant = tenantRepository.save(tenant)

        // Create default placement
        val placement = TenantPlacement(tenantId = savedTenant.id)
        tenantPlacementRepository.save(placement)

        // Add the owner as a member with admin role
        val adminRole = roleRepository.findByName("admin")
            ?: throw IllegalStateException("Default 'admin' role not found. Ensure seed data has run.")

        val membership = TenantMembership(
            tenantId = savedTenant.id,
            userId = input.ownerUserId,
        )
        membership.addRole(adminRole)
        tenantMembershipRepository.save(membership)

        return savedTenant.toTO()
    }

    override fun updateTenant(tenantId: Long, displayName: String?): TenantTO {
        val tenant = tenantRepository.findById(tenantId)
            .orElseThrow { NoSuchElementException("Tenant $tenantId not found") }
        tenant.updateProfile(displayName)
        return tenantRepository.save(tenant).toTO()
    }
}
