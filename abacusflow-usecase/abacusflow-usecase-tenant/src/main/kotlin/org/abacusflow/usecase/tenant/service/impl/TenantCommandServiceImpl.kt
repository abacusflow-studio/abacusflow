package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.commons.tenant.withTenant
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantPlacementRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.RoleRepository
import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.tenant.TenantPlacement
import org.abacusflow.user.Role
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
    private val permissionRepository: PermissionRepository,
    private val currentTenantProvider: CurrentTenantProvider,
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

        // Create default roles for the new tenant with permissions
        val allPermissions = permissionRepository.findAllByOrderByNameAsc()

        val adminRole = Role(name = "admin", tenantId = savedTenant.id).apply {
            updateProfile("超级管理员")
            allPermissions.forEach { addPermission(it) }
        }
        val readerRole = Role(name = "reader", tenantId = savedTenant.id).apply {
            updateProfile("只读用户")
            allPermissions.filter { it.name.endsWith(":read") }.forEach { addPermission(it) }
        }
        val operatorRole = Role(name = "operator", tenantId = savedTenant.id).apply {
            updateProfile("操作员")
            allPermissions.filter { it.name !in listOf("user:read", "role:read", "user:manage", "role:manage") }
                .forEach { addPermission(it) }
        }
        roleRepository.saveAll(listOf(adminRole, readerRole, operatorRole))

        // Add the owner as a member with admin role
        val membership = TenantMembership(
            tenantId = savedTenant.id,
            userId = input.ownerUserId,
        )
        membership.addRole(adminRole)
        tenantMembershipRepository.save(membership)

        return withTenant(savedTenant.id) {
            savedTenant.toTO()
        }
    }

    override fun updateTenant(tenantId: Long, displayName: String?): TenantTO {
        val tenant = tenantRepository.findById(tenantId)
            .orElseThrow { NoSuchElementException("Tenant $tenantId not found") }
        tenant.updateProfile(displayName)
        return tenantRepository.save(tenant).toTO()
    }
}
