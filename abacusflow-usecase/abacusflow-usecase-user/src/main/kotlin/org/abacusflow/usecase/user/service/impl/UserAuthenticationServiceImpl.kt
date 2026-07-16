package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.usecase.tenant.TenantSelectionStatus
import org.abacusflow.usecase.tenant.TenantSummaryTO
import org.abacusflow.usecase.user.BootstrapResultTO
import org.abacusflow.usecase.user.CurrentUserTO
import org.abacusflow.usecase.user.service.OidcUserProfileFetcher
import org.abacusflow.usecase.user.service.UserAuthenticationService
import org.abacusflow.user.ExternalIdentity
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
@Transactional
class UserAuthenticationServiceImpl(
    private val externalIdentityRepository: ExternalIdentityRepository,
    private val tenantMembershipRepository: TenantMembershipRepository,
    private val tenantRepository: TenantRepository,
    private val currentTenantProvider: CurrentTenantProvider,
    private val profileFetcher: OidcUserProfileFetcher,
) : UserAuthenticationService {

    companion object {
        /** Profile sync threshold: 24 hours */
        private const val PROFILE_SYNC_THRESHOLD_SECONDS = 24 * 60 * 60L
    }

    override fun bootstrap(
        issuer: String,
        subject: String,
        accessToken: String,
    ): BootstrapResultTO {
        val externalIdentity =
            externalIdentityRepository.findByIssuerAndSubject(issuer, subject)
                ?: throw IllegalStateException(
                    "ExternalIdentity not found for issuer=$issuer subject=$subject. " +
                        "User should have been auto-created during authentication.",
                )

        val user = externalIdentity.user

        // Sync profile from OIDC provider if stale (>24h since last sync)
        val shouldSync = externalIdentity.profileSyncedAt == null ||
            externalIdentity.profileSyncedAt!!.isBefore(
                Instant.now().minusSeconds(PROFILE_SYNC_THRESHOLD_SECONDS),
            )
        if (shouldSync) {
            val profile = profileFetcher.fetchProfile(accessToken)
            if (profile != null) {
                externalIdentity.syncProfile(profile.email, profile.emailVerified, profile.displayName, profile.pictureUrl)
                val nick = profile.displayName ?: profile.email ?: user.name
                user.updateProfile(newSex = null, newAge = null, newNick = nick)
            }
        }

        externalIdentity.recordLogin()
        externalIdentityRepository.save(externalIdentity)

        if (user.locked) {
            return buildResult(user, externalIdentity, BootstrapResultTO.UserStatus.LOCKED)
        }

        return buildResult(user, externalIdentity, BootstrapResultTO.UserStatus.ACTIVE)
    }

    override fun getCurrentUser(
        issuer: String,
        subject: String,
    ): CurrentUserTO? {
        val identity =
            externalIdentityRepository.findByIssuerAndSubject(issuer, subject)
                ?: return null

        val user = identity.user

        val (tenantStatus, tenantSummaries, currentTenantId) = resolveTenantInfo(user.id)

        // Resolve roles/permissions based on tenant context
        val roles: List<String>
        val permissions: List<String>

        if (tenantSummaries.size == 1) {
            // Single tenant: use that tenant's roles
            roles = tenantSummaries[0].roleNames
            permissions = resolvePermissionsForTenant(user.id, tenantSummaries[0].tenantId)
        } else if (currentTenantId != null) {
            // Multi-tenant with a selected tenant: use selected tenant's roles
            val selectedSummary = tenantSummaries.find { it.tenantId == currentTenantId }
            roles = selectedSummary?.roleNames ?: emptyList()
            permissions = resolvePermissionsForTenant(user.id, currentTenantId)
        } else {
            // No tenant or multi-tenant without selection: no roles at user level
            // Roles are now managed exclusively through tenant memberships
            roles = emptyList()
            permissions = emptyList()
        }

        return CurrentUserTO(
            userId = user.id,
            username = user.name,
            email = identity.email,
            displayName = identity.displayName ?: user.nick,
            pictureUrl = identity.pictureUrl,
            enabled = user.enabled,
            locked = user.locked,
            roles = roles,
            permissions = permissions,
            tenantStatus = tenantStatus,
            tenants = tenantSummaries,
            currentTenantId = currentTenantId,
        )
    }

    private fun buildResult(
        user: org.abacusflow.user.User,
        identity: ExternalIdentity,
        status: BootstrapResultTO.UserStatus,
    ): BootstrapResultTO {
        val (tenantStatus, tenantSummaries, currentTenantId) = resolveTenantInfo(user.id)

        // Resolve roles/permissions based on tenant context
        val roles: List<String>
        val permissions: List<String>

        if (tenantSummaries.size == 1) {
            // Single tenant: use that tenant's roles
            roles = tenantSummaries[0].roleNames
            permissions = resolvePermissionsForTenant(user.id, tenantSummaries[0].tenantId)
        } else if (currentTenantId != null) {
            // Multi-tenant with a selected tenant: use selected tenant's roles
            val selectedSummary = tenantSummaries.find { it.tenantId == currentTenantId }
            roles = selectedSummary?.roleNames ?: emptyList()
            permissions = resolvePermissionsForTenant(user.id, currentTenantId)
        } else {
            // No tenant or multi-tenant without selection: no roles at user level
            // Roles are now managed exclusively through tenant memberships
            roles = emptyList()
            permissions = emptyList()
        }

        return BootstrapResultTO(
            userId = user.id,
            status = status,
            enabled = user.enabled,
            locked = user.locked,
            roles = roles,
            permissions = permissions,
            email = identity.email,
            displayName = identity.displayName,
            pictureUrl = identity.pictureUrl,
            tenantStatus = tenantStatus,
            tenants = tenantSummaries,
            currentTenantId = currentTenantId,
        )
    }

    private data class TenantInfo(
        val tenantStatus: TenantSelectionStatus,
        val tenantSummaries: List<TenantSummaryTO>,
        val currentTenantId: Long?,
    )

    private fun resolveTenantInfo(userId: Long): TenantInfo {
        val memberships = tenantMembershipRepository.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE)

        val tenantSummaries = memberships.map { membership ->
            val tenant = tenantRepository.findById(membership.tenantId).orElse(null)
            TenantSummaryTO(
                tenantId = membership.tenantId,
                name = tenant?.name ?: "",
                displayName = tenant?.displayName,
                roleNames = membership.roles.map { it.name },
                permissionNames = membership.roles.flatMap { it.permissions }.map { it.name }.distinct(),
            )
        }

        val tenantStatus = when {
            tenantSummaries.isEmpty() -> TenantSelectionStatus.NEEDS_ONBOARDING
            tenantSummaries.size == 1 -> TenantSelectionStatus.SINGLE_TENANT
            else -> TenantSelectionStatus.MULTI_TENANT
        }

        // For single-tenant users, auto-set the current tenant
        val currentTenantId = when (tenantStatus) {
            TenantSelectionStatus.SINGLE_TENANT -> tenantSummaries[0].tenantId
            TenantSelectionStatus.MULTI_TENANT -> currentTenantProvider.getCurrentTenantId()
            TenantSelectionStatus.NEEDS_ONBOARDING -> null
        }

        // Auto-set tenant context for single-tenant users
        if (tenantStatus == TenantSelectionStatus.SINGLE_TENANT) {
            currentTenantProvider.setTenantId(tenantSummaries[0].tenantId)
        }

        return TenantInfo(tenantStatus, tenantSummaries, currentTenantId)
    }

    private fun resolvePermissionsForTenant(userId: Long, tenantId: Long): List<String> {
        val membership = tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)
            ?: return emptyList()
        return membership.roles.flatMap { role -> role.permissions.map { it.name } }.distinct()
    }
}
