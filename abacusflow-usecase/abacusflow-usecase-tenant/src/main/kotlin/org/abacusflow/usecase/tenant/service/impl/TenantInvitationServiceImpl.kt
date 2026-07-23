package org.abacusflow.usecase.tenant.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.commons.tenant.withTenant
import org.abacusflow.db.TenantPersistenceContext
import org.abacusflow.db.tenant.TenantInvitationRepository
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.TenantRoleRepository
import org.abacusflow.tenant.TenantInvitation
import org.abacusflow.tenant.TenantMembership
import org.abacusflow.tenant.TenantStatus
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
    private val roleRepository: TenantRoleRepository,
    private val currentTenantProvider: CurrentTenantProvider,
    private val tenantPersistenceContext: TenantPersistenceContext,
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
        val normalizedEmail = email.trim().lowercase()
        require(normalizedEmail.isNotBlank() && '@' in normalizedEmail) { "A valid invitation email is required" }
        // Verify tenant exists
        val tenant =
            tenantRepository.findById(tenantId)
                .orElseThrow { NoSuchElementException("Tenant $tenantId not found") }
        require(tenant.status == TenantStatus.ACTIVE) { "Only active tenants can invite members" }

        // Check if there's already a pending invitation for this email in this tenant
        val existingInvitation = tenantInvitationRepository.findByTenantIdAndEmail(tenantId, normalizedEmail)
        if (existingInvitation != null && existingInvitation.status == "PENDING" && !existingInvitation.isExpired()) {
            throw IllegalStateException("An active invitation already exists for $email in tenant $tenantId")
        }

        // Validate role IDs belong to this tenant
        val roles =
            roleIds.map { roleId ->
                roleRepository.findById(roleId)
                    .orElseThrow { NoSuchElementException("Role $roleId not found") }
            }

        // Generate unique token
        val token = UUID.randomUUID().toString()

        val invitation =
            TenantInvitation(
                tenantId = tenantId,
                email = normalizedEmail,
                roleIds = roleIds.toMutableSet(),
                invitedByUserId = invitedByUserId,
                token = token,
                expiresAt = Instant.now().plusSeconds(INVITATION_EXPIRY_DAYS * 24 * 60 * 60),
            )

        val saved = tenantInvitationRepository.save(invitation)
        log.info("Created invitation for $email to tenant $tenantId (invitedBy=$invitedByUserId)")

        return saved.toTO(
            tenantName = tenant.name,
            roleNames = roles.map { it.name },
        )
    }

    @Transactional(readOnly = true)
    override fun listInvitations(tenantId: Long): List<TenantInvitationTO> {
        val tenant =
            tenantRepository.findById(tenantId)
                .orElseThrow { NoSuchElementException("Tenant $tenantId not found") }

        return tenantInvitationRepository.findAllByTenantId(tenantId).map { invitation ->
            val roleNames =
                invitation.roleIds.mapNotNull { roleId ->
                    roleRepository.findById(roleId).orElse(null)?.name
                }
            invitation.toTO(tenantName = tenant.name, roleNames = roleNames)
        }
    }

    @Transactional(readOnly = true)
    override fun listMyPendingInvitations(
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ): List<TenantInvitationTO> {
        val normalizedEmail = requireVerifiedEmail(authenticatedEmail, emailVerified)
        return tenantInvitationRepository.findAllByEmailAndStatusOrderByCreatedAtDesc(normalizedEmail, "PENDING")
            .filterNot(TenantInvitation::isExpired)
            .map(::toDetailedTO)
    }

    override fun acceptInvitation(
        token: String,
        userId: Long,
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ): TenantInvitationTO {
        val invitation =
            tenantInvitationRepository.findByToken(token)
                ?: throw NoSuchElementException("Invitation not found")

        return acceptMatchingInvitation(invitation, userId, authenticatedEmail, emailVerified)
    }

    override fun acceptInvitationById(
        invitationId: Long,
        userId: Long,
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ): TenantInvitationTO {
        val invitation =
            tenantInvitationRepository.findById(invitationId)
                .orElseThrow { NoSuchElementException("Invitation $invitationId not found") }

        return acceptMatchingInvitation(invitation, userId, authenticatedEmail, emailVerified)
    }

    private fun acceptMatchingInvitation(
        invitation: TenantInvitation,
        userId: Long,
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ): TenantInvitationTO {
        requireInvitationMatchesIdentity(invitation, authenticatedEmail, emailVerified)

        require(invitation.status == "PENDING") { "Invitation has already been ${invitation.status.lowercase()}" }
        require(!invitation.isExpired()) { "Invitation has expired" }

        return withTenant(invitation.tenantId) {
            tenantPersistenceContext.activate(invitation.tenantId)

            val tenant =
                tenantRepository.findById(invitation.tenantId)
                    .orElseThrow { NoSuchElementException("Tenant ${invitation.tenantId} not found") }
            if (invitation.initialAdministrator) {
                require(tenant.status == TenantStatus.PENDING_ACTIVATION) { "Initial invitation tenant is not pending activation" }
            } else {
                require(tenant.status == TenantStatus.ACTIVE) { "Tenant is not active" }
            }

            // Check if user is already a member
            if (tenantMembershipRepository.existsByTenantIdAndUserId(invitation.tenantId, userId)) {
                throw IllegalStateException("User $userId is already a member of tenant ${invitation.tenantId}")
            }

            // Resolve the complete role set before mutating any managed aggregate.
            val roles =
                invitation.roleIds.map { roleId ->
                    roleRepository.findById(roleId)
                        .orElseThrow { NoSuchElementException("Role $roleId not found") }
                }
            val membership =
                TenantMembership(
                    tenantId = invitation.tenantId,
                    userId = userId,
                )
            roles.forEach(membership::addRole)
            tenantMembershipRepository.save(membership)

            invitation.accept()
            tenantInvitationRepository.save(invitation)
            if (invitation.initialAdministrator) {
                tenant.activateFromInitialInvitation()
                tenantRepository.save(tenant)
            }

            log.info("User $userId accepted invitation to tenant ${invitation.tenantId}")

            invitation.toTO(
                tenantName = tenant.name,
                roleNames = roles.map { it.name },
            )
        }
    }

    override fun declineInvitation(
        invitationId: Long,
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ): TenantInvitationTO {
        val invitation =
            tenantInvitationRepository.findById(invitationId)
                .orElseThrow { NoSuchElementException("Invitation $invitationId not found") }
        requireInvitationMatchesIdentity(invitation, authenticatedEmail, emailVerified)
        require(invitation.status == "PENDING") { "Invitation has already been ${invitation.status.lowercase()}" }
        require(!invitation.isExpired()) { "Invitation has expired" }

        invitation.decline()
        tenantInvitationRepository.save(invitation)
        log.info("Invitation ${invitation.id} to tenant ${invitation.tenantId} was declined by its intended recipient")
        return toDetailedTO(invitation)
    }

    override fun cancelInvitation(invitationId: Long): TenantInvitationTO {
        val tenantId = currentTenantProvider.requireTenantId()
        val invitation =
            tenantInvitationRepository.findByIdAndTenantId(invitationId, tenantId)
                ?: throw NoSuchElementException("Invitation $invitationId not found")

        require(invitation.status == "PENDING") { "Can only cancel pending invitations" }

        invitation.cancel()
        tenantInvitationRepository.save(invitation)

        val tenant = tenantRepository.findById(invitation.tenantId).orElse(null)
        val roleNames =
            invitation.roleIds.mapNotNull { roleId ->
                roleRepository.findById(roleId).orElse(null)?.name
            }

        log.info("Cancelled invitation ${invitation.id} for ${invitation.email} to tenant ${invitation.tenantId}")

        return invitation.toTO(
            tenantName = tenant?.name ?: "",
            roleNames = roleNames,
        )
    }

    override fun reissueInitialInvitation(
        tenantId: Long,
        email: String,
        invitedByUserId: Long,
    ): TenantInvitationTO {
        val normalizedEmail = email.trim().lowercase()
        require(normalizedEmail.isNotBlank() && '@' in normalizedEmail) { "A valid initial administrator email is required" }
        val tenant =
            tenantRepository.findById(tenantId)
                .orElseThrow { NoSuchElementException("Tenant $tenantId not found") }
        require(tenant.status == TenantStatus.PENDING_ACTIVATION) { "Only pending tenants can reissue the initial invitation" }

        return withTenant(tenantId) {
            tenantPersistenceContext.activate(tenantId)
            tenantInvitationRepository.findAllByTenantId(tenantId)
                .filter { it.initialAdministrator && it.status == "PENDING" }
                .forEach {
                    it.cancel()
                    tenantInvitationRepository.save(it)
                }

            val adminRole =
                roleRepository.findByName("admin")
                    ?: throw NoSuchElementException("Default admin role not found for tenant $tenantId")
            val invitation =
                tenantInvitationRepository.save(
                    TenantInvitation(
                        tenantId = tenantId,
                        email = normalizedEmail,
                        roleIds = mutableSetOf(adminRole.id),
                        invitedByUserId = invitedByUserId,
                        token = UUID.randomUUID().toString(),
                        expiresAt = Instant.now().plusSeconds(INVITATION_EXPIRY_DAYS * 24 * 60 * 60),
                        initialAdministrator = true,
                    ),
                )
            invitation.toTO(tenantName = tenant.name, roleNames = listOf(adminRole.name))
        }
    }

    private fun requireVerifiedEmail(
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ): String {
        require(emailVerified) { "A verified email is required to manage invitations" }
        val normalizedEmail = authenticatedEmail?.trim()?.lowercase()
        require(!normalizedEmail.isNullOrBlank()) { "A verified email is required to manage invitations" }
        return normalizedEmail
    }

    private fun requireInvitationMatchesIdentity(
        invitation: TenantInvitation,
        authenticatedEmail: String?,
        emailVerified: Boolean,
    ) {
        val normalizedEmail = requireVerifiedEmail(authenticatedEmail, emailVerified)
        require(normalizedEmail == invitation.email.trim().lowercase()) {
            "Authenticated email does not match the invitation"
        }
    }

    private fun toDetailedTO(invitation: TenantInvitation): TenantInvitationTO =
        withTenant(invitation.tenantId) {
            tenantPersistenceContext.activate(invitation.tenantId)
            val tenant =
                tenantRepository.findById(invitation.tenantId)
                    .orElseThrow { NoSuchElementException("Tenant ${invitation.tenantId} not found") }
            val roleNames =
                invitation.roleIds.mapNotNull { roleId ->
                    roleRepository.findById(roleId).orElse(null)?.name
                }
            invitation.toTO(tenantName = tenant.name, roleNames = roleNames)
        }
}
