package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.commons.tenant.withTenant
import org.abacusflow.db.TenantPersistenceContext
import org.abacusflow.db.tenant.TenantInvitationRepository
import org.abacusflow.db.tenant.TenantPlacementRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.TenantRoleRepository
import org.abacusflow.tenant.Tenant
import org.abacusflow.tenant.TenantInvitation
import org.abacusflow.tenant.TenantPlacement
import org.abacusflow.tenant.TenantStatus
import org.abacusflow.usecase.tenant.CreateTenantInputTO
import org.abacusflow.usecase.tenant.TenantProvisioningTO
import org.abacusflow.usecase.tenant.TenantTO
import org.abacusflow.usecase.tenant.mapper.toTO
import org.abacusflow.usecase.tenant.service.TenantCommandService
import org.abacusflow.user.PermissionScope
import org.abacusflow.tenant.TenantRole
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
@Transactional
class TenantCommandServiceImpl(
    private val tenantRepository: TenantRepository,
    private val tenantInvitationRepository: TenantInvitationRepository,
    private val tenantPlacementRepository: TenantPlacementRepository,
    private val roleRepository: TenantRoleRepository,
    private val permissionRepository: PermissionRepository,
    private val tenantPersistenceContext: TenantPersistenceContext,
) : TenantCommandService {
    override fun createTenant(input: CreateTenantInputTO): TenantProvisioningTO {
        require(!tenantRepository.existsByName(input.name)) { "Tenant name '${input.name}' already exists" }
        val normalizedEmail = input.initialAdministratorEmail.trim().lowercase()
        require(normalizedEmail.isNotBlank() && '@' in normalizedEmail) { "A valid initial administrator email is required" }

        val tenant =
            Tenant(name = input.name, initialStatus = TenantStatus.PENDING_ACTIVATION).apply {
                updateProfile(input.displayName)
            }
        val savedTenant = tenantRepository.save(tenant)

        return withTenant(savedTenant.id) {
            // The transaction started before the new tenant ID existed.
            tenantPersistenceContext.activate(savedTenant.id)

            // Create default placement
            val placement = TenantPlacement(tenantId = savedTenant.id)
            tenantPlacementRepository.save(placement)

            // Create default roles for the new tenant with permissions
            val allPermissions = permissionRepository.findAllByOrderByNameAsc()

            val tenantPermissions = allPermissions.filter { it.scope == PermissionScope.TENANT }
            val businessPermissions = allPermissions.filter { it.scope == PermissionScope.BUSINESS }

            val adminTenantRole =
                TenantRole(name = "admin", tenantId = savedTenant.id).apply {
                    updateProfile("超级管理员")
                    tenantPermissions.forEach { addPermission(it) }
                    businessPermissions.forEach { addPermission(it) }
                }
            val readerTenantRole =
                TenantRole(name = "reader", tenantId = savedTenant.id).apply {
                    updateProfile("只读用户")
                    businessPermissions.filter { it.name.endsWith(":read") }.forEach { addPermission(it) }
                }
            val operatorTenantRole =
                TenantRole(name = "operator", tenantId = savedTenant.id).apply {
                    updateProfile("操作员")
                    businessPermissions.forEach { addPermission(it) }
                }
            roleRepository.saveAll(listOf(adminTenantRole, readerTenantRole, operatorTenantRole))

            val invitation =
                tenantInvitationRepository.save(
                    TenantInvitation(
                        tenantId = savedTenant.id,
                        email = normalizedEmail,
                        roleIds = mutableSetOf(adminTenantRole.id),
                        invitedByUserId = input.createdByUserId,
                        token = UUID.randomUUID().toString(),
                        expiresAt = Instant.now().plus(7, ChronoUnit.DAYS),
                        initialAdministrator = true,
                    ),
                )
            TenantProvisioningTO(
                tenant = savedTenant.toTO(),
                initialInvitation =
                    invitation.toTO(
                        tenantName = savedTenant.name,
                        roleNames = listOf(adminTenantRole.name),
                    ),
            )
        }
    }

    override fun updateOwnTenant(
        tenantId: Long,
        displayName: String?,
    ): TenantTO {
        val tenant =
            tenantRepository.findById(tenantId)
                .orElseThrow { NoSuchElementException("Tenant $tenantId not found") }
        tenant.updateProfile(displayName)
        return tenantRepository.save(tenant).toTO()
    }

    override fun updateTenant(
        tenantId: Long,
        displayName: String?,
    ): TenantTO {
        // Platform-level update — same logic, but gated by @PreAuthorize on the interface
        val tenant =
            tenantRepository.findById(tenantId)
                .orElseThrow { NoSuchElementException("Tenant $tenantId not found") }
        tenant.updateProfile(displayName)
        return tenantRepository.save(tenant).toTO()
    }
}
