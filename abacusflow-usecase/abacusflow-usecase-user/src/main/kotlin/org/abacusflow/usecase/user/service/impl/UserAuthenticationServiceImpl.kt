package org.abacusflow.usecase.user.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.commons.tenant.withTenant
import org.abacusflow.db.TenantPersistenceContext
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.db.user.PlatformUserRoleRepository
import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.tenant.TenantStatus
import org.abacusflow.usecase.tenant.TenantSelectionStatus
import org.abacusflow.usecase.tenant.TenantSummaryTO
import org.abacusflow.usecase.user.BootstrapResultTO
import org.abacusflow.usecase.user.CurrentUserTO
import org.abacusflow.usecase.user.service.OidcUserProfileFetcher
import org.abacusflow.usecase.user.service.UserAuthenticationService
import org.abacusflow.user.ExternalIdentity
import org.abacusflow.user.PermissionScope
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
@Transactional
class UserAuthenticationServiceImpl(
    private val externalIdentityRepository: ExternalIdentityRepository,
    private val tenantMembershipRepository: TenantMembershipRepository,
    private val tenantRepository: TenantRepository,
    private val platformUserRoleRepository: PlatformUserRoleRepository,
    private val currentTenantProvider: CurrentTenantProvider,
    private val profileFetcher: OidcUserProfileFetcher,
    private val tenantPersistenceContext: TenantPersistenceContext,
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

        // Unverified identities are refreshed on every bootstrap so a user who just
        // verified their email can discover invitations immediately instead of
        // waiting for the normal 24-hour profile refresh window.
        val shouldSync =
            !externalIdentity.emailVerified ||
                externalIdentity.profileSyncedAt == null ||
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

        val globalAuthorization = resolveGlobalAuthorization(user.id)
        val selectedTenantRoles = resolveSelectedTenantRoles(tenantSummaries, currentTenantId)
        val selectedTenantPermissions = currentTenantId?.let { resolvePermissionsForTenant(user.id, it) }.orEmpty()
        val roles = (globalAuthorization.roleNames + selectedTenantRoles).distinct()
        val permissions = (globalAuthorization.permissionNames + selectedTenantPermissions).distinct()

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
            platformPermissions = globalAuthorization.permissionNames,
            platformRoles = globalAuthorization.roleNames,
            tenantPermissions = selectedTenantPermissions,
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

        val globalAuthorization = resolveGlobalAuthorization(user.id)
        val selectedTenantRoles = resolveSelectedTenantRoles(tenantSummaries, currentTenantId)
        val selectedTenantPermissions = currentTenantId?.let { resolvePermissionsForTenant(user.id, it) }.orEmpty()
        val roles = (globalAuthorization.roleNames + selectedTenantRoles).distinct()
        val permissions = (globalAuthorization.permissionNames + selectedTenantPermissions).distinct()

        return BootstrapResultTO(
            userId = user.id,
            status = status,
            enabled = user.enabled,
            locked = user.locked,
            roles = roles,
            permissions = permissions,
            platformPermissions = globalAuthorization.permissionNames,
            platformRoles = globalAuthorization.roleNames,
            tenantPermissions = selectedTenantPermissions,
            email = identity.email,
            emailVerified = identity.emailVerified,
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

        val tenantSummaries =
            memberships.mapNotNull { membership ->
                val tenant =
                    tenantRepository.findByIdAndStatus(membership.tenantId, TenantStatus.ACTIVE)
                        ?: return@mapNotNull null
                withTenant(membership.tenantId) {
                    tenantPersistenceContext.activate(membership.tenantId)
                    TenantSummaryTO(
                        tenantId = membership.tenantId,
                        name = tenant.name,
                        displayName = tenant.displayName,
                        roleNames = membership.tenantRoles.map { it.name },
                        permissionNames =
                            membership.tenantRoles
                                .flatMap { it.permissions }
                                .filter { it.scope != PermissionScope.PLATFORM }
                                .map { it.name }
                                .distinct(),
                    )
                }
            }

        val tenantStatus =
            when {
                tenantSummaries.isEmpty() -> TenantSelectionStatus.NEEDS_ONBOARDING
                tenantSummaries.size == 1 -> TenantSelectionStatus.SINGLE_TENANT
                else -> TenantSelectionStatus.MULTI_TENANT
            }

        // For single-tenant users, auto-set the current tenant
        val currentTenantId =
            when (tenantStatus) {
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

    private fun resolvePermissionsForTenant(
        userId: Long,
        tenantId: Long,
    ): List<String> {
        tenantPersistenceContext.activate(tenantId)
        val membership =
            tenantMembershipRepository.findByTenantIdAndUserId(tenantId, userId)
                ?: return emptyList()
        return membership.tenantRoles
            .flatMap { role -> role.permissions }
            .filter { it.scope != PermissionScope.PLATFORM }
            .map { it.name }
            .distinct()
    }

    private data class GlobalAuthorization(
        val roleNames: List<String>,
        val permissionNames: List<String>,
    )

    private fun resolveGlobalAuthorization(userId: Long): GlobalAuthorization {
        val assignments = platformUserRoleRepository.findAllByUserId(userId)
        return GlobalAuthorization(
            roleNames = assignments.map { it.role.name }.distinct(),
            permissionNames =
                assignments
                    .flatMap { it.role.permissions }
                    .filter { it.scope == PermissionScope.PLATFORM }
                    .map { it.name }
                    .distinct(),
        )
    }

    private fun resolveSelectedTenantRoles(
        tenantSummaries: List<TenantSummaryTO>,
        currentTenantId: Long?,
    ): List<String> =
        currentTenantId
            ?.let { selectedId -> tenantSummaries.find { it.tenantId == selectedId }?.roleNames }
            .orEmpty()
}
