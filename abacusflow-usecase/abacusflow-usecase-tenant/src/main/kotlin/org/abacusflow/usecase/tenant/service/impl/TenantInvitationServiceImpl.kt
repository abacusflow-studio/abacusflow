package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.db.tenant.TenantInvitationRepository
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.RoleRepository
import org.abacusflow.tenant.TenantInvitation
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.usecase.tenant.TenantInvitationTO
import org.abacusflow.usecase.tenant.mapper.toTO
import org.abacusflow.usecase.tenant.service.TenantInvitationService
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
@Transactional
class TenantInvitationServiceImpl(
    private val tenantInvitationRepository: TenantInvitationRepository,
    private val tenantMembershipRepository: TenantMembershipRepository,
    private val tenantRepository: TenantRepository,
    private val roleRepository: RoleRepository,
) : TenantInvitationService {

    private val log = LoggerFactory.getLogger(javaClass)

    companion object {
        /** 邀请有效期：7 天 */
        private const val INVITATION_EXPIRY_DAYS = 7L
    }

    override fun createInvitation(
        tenantId: Long,
        email: String,
        roleIds: List<Long>,
        invitedByUserId: Long,
    ): TenantInvitationTO {
        // Verify tenant exists
        val tenant = tenantRepository.findById(tenantId)
            .orElseThrow { NoSuchElementException("Tenant $tenantId not found") }

        // Check if there's already a pending invitation for this email in this tenant
        val existingInvitation = tenantInvitationRepository.findByTenantIdAndEmail(tenantId, email)
        if (existingInvitation != null && existingInvitation.status == "PENDING" && !existingInvitation.isExpired()) {
            throw IllegalStateException("An active invitation already exists for $email in tenant $tenantId")
        }

        // Validate role IDs belong to this tenant
        val roles = roleIds.map { roleId ->
            roleRepository.findById(roleId)
                .orElseThrow { NoSuchElementException("Role $roleId not found") }
        }
        roles.forEach { role ->
            require(role.tenantId == tenantId) { "Role ${role.id} does not belong to tenant $tenantId" }
        }

        // Generate unique token
        val token = UUID.randomUUID().toString()

        val invitation = TenantInvitation(
            tenantId = tenantId,
            email = email.trim().lowercase(),
            roleIds = roleIds.toMutableSet(),
            invitedByUserId = invitedByUserId,
            token = token,
            expiresAt = Instant.now().plusSeconds(INVITATION_EXPIRY_DAYS * 24 * 60 * 60),
        )

        val saved = tenantInvitationRepository.save(invitation)
        log.info("Created invitation for $email to tenant $tenantId (token=$token, invitedBy=$invitedByUserId)")

        return saved.toTO(
            tenantName = tenant.name,
            roleNames = roles.map { it.name },
        )
    }

    @Transactional(readOnly = true)
    override fun listInvitations(tenantId: Long): List<TenantInvitationTO> {
        val tenant = tenantRepository.findById(tenantId)
            .orElseThrow { NoSuchElementException("Tenant $tenantId not found") }

        return tenantInvitationRepository.findAllByTenantId(tenantId).map { invitation ->
            val roleNames = invitation.roleIds.mapNotNull { roleId ->
                roleRepository.findById(roleId).map { it.name }.orElse(null)
            }
            invitation.toTO(tenantName = tenant.name, roleNames = roleNames)
        }
    }

    override fun acceptInvitation(token: String, userId: Long): TenantInvitationTO {
        val invitation = tenantInvitationRepository.findByToken(token)
            ?: throw NoSuchElementException("Invitation not found for token $token")

        // Validate invitation
        require(invitation.status == "PENDING") { "Invitation has already been ${invitation.status.lowercase()}" }
        require(!invitation.isExpired()) { "Invitation has expired" }

        // Check if user is already a member
        if (tenantMembershipRepository.existsByTenantIdAndUserId(invitation.tenantId, userId)) {
            throw IllegalStateException("User $userId is already a member of tenant ${invitation.tenantId}")
        }

        // Accept the invitation
        invitation.accept()
        tenantInvitationRepository.save(invitation)

        // Create membership with the specified roles
        val membership = TenantMembership(
            tenantId = invitation.tenantId,
            userId = userId,
        )
        invitation.roleIds.forEach { roleId ->
            roleRepository.findById(roleId).ifPresent { role ->
                membership.addRole(role)
            }
        }
        tenantMembershipRepository.save(membership)

        val tenant = tenantRepository.findById(invitation.tenantId).orElse(null)
        val roleNames = invitation.roleIds.mapNotNull { roleId ->
            roleRepository.findById(roleId).map { it.name }.orElse(null)
        }

        log.info("User $userId accepted invitation to tenant ${invitation.tenantId}")

        return invitation.toTO(
            tenantName = tenant?.name ?: "",
            roleNames = roleNames,
        )
    }

    override fun cancelInvitation(invitationId: Long): TenantInvitationTO {
        val invitation = tenantInvitationRepository.findById(invitationId)
            .orElseThrow { NoSuchElementException("Invitation $invitationId not found") }

        require(invitation.status == "PENDING") { "Can only cancel pending invitations" }

        // Delete the invitation
        tenantInvitationRepository.delete(invitation)

        val tenant = tenantRepository.findById(invitation.tenantId).orElse(null)
        val roleNames = invitation.roleIds.mapNotNull { roleId ->
            roleRepository.findById(roleId).map { it.name }.orElse(null)
        }

        log.info("Cancelled invitation ${invitation.id} for ${invitation.email} to tenant ${invitation.tenantId}")

        return invitation.toTO(
            tenantName = tenant?.name ?: "",
            roleNames = roleNames,
        )
    }
}
