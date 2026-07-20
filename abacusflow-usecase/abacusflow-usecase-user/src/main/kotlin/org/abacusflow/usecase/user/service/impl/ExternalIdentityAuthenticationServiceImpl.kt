package org.abacusflow.usecase.user.service.impl

import org.abacusflow.commons.tenant.withTenant
import org.abacusflow.db.TenantPersistenceContext
import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.db.user.PlatformUserRoleRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.tenant.TenantStatus
import org.abacusflow.usecase.user.AuthenticatedUserTO
import org.abacusflow.usecase.user.service.ExternalIdentityAuthenticationService
import org.abacusflow.usecase.user.service.OidcUserProfileFetcher
import org.abacusflow.user.ExternalIdentity
import org.abacusflow.user.User
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest

@Service
@Transactional
class ExternalIdentityAuthenticationServiceImpl(
    private val externalIdentityRepository: ExternalIdentityRepository,
    private val userRepository: UserRepository,
    private val tenantMembershipRepository: TenantMembershipRepository,
    private val tenantRepository: TenantRepository,
    private val platformUserRoleRepository: PlatformUserRoleRepository,
    private val profileFetcher: OidcUserProfileFetcher,
    private val tenantPersistenceContext: TenantPersistenceContext,
) : ExternalIdentityAuthenticationService {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun resolveAuthorizedUser(
        issuer: String,
        subject: String,
        accessToken: String?,
    ): AuthenticatedUserTO? {
        val externalIdentity = externalIdentityRepository.findByIssuerAndSubject(issuer, subject)

        if (externalIdentity != null) {
            return buildAuthenticatedUser(externalIdentity, accessToken)
        }

        return createUserAndIdentity(issuer, subject, accessToken)
    }

    private fun buildAuthenticatedUser(
        externalIdentity: ExternalIdentity,
        accessToken: String?,
    ): AuthenticatedUserTO? {
        val user = externalIdentity.user

        if (!user.enabled || user.locked) {
            return null
        }

        // Sync profile if never synced before (profileSyncedAt == null)
        if (accessToken != null && externalIdentity.profileSyncedAt == null) {
            val profile = profileFetcher.fetchProfile(accessToken)
            if (profile != null) {
                externalIdentity.syncProfile(profile.email, profile.emailVerified, profile.displayName, profile.pictureUrl)
                externalIdentity.recordLogin()
                externalIdentityRepository.save(externalIdentity)

                val nick = profile.displayName ?: profile.email ?: user.name
                user.updateProfile(newSex = null, newAge = null, newNick = nick)
                log.info("Synced OIDC profile for existing user ${user.id} (first-time sync)")
            }
        }

        val memberships = tenantMembershipRepository.findByUserIdAndStatus(user.id, MembershipStatus.ACTIVE)
        val membershipInfos =
            memberships.mapNotNull { membership ->
                val tenant =
                    tenantRepository.findByIdAndStatus(membership.tenantId, TenantStatus.ACTIVE)
                        ?: return@mapNotNull null
                withTenant(membership.tenantId) {
                    tenantPersistenceContext.activate(membership.tenantId)
                    AuthenticatedUserTO.TenantMembershipInfo(
                        tenantId = membership.tenantId,
                        tenantName = tenant.name,
                        tenantDisplayName = tenant.displayName,
                        roleNames = membership.tenantRoles.map { it.name }.toSet(),
                        permissionNames =
                            membership.tenantRoles
                                .flatMap { it.permissions }
                                .filter { it.scope != org.abacusflow.user.PermissionScope.PLATFORM }
                                .map { it.name }
                                .toSet(),
                    )
                }
            }

        val platformAssignments = platformUserRoleRepository.findAllByUserId(user.id)
        val platformRoles = platformAssignments.mapTo(mutableSetOf()) { it.role.name }
        val platformPermissions =
            platformAssignments
                .flatMap { it.role.permissions }
                .filter { it.scope == org.abacusflow.user.PermissionScope.PLATFORM }
                .mapTo(mutableSetOf()) { it.name }

        return AuthenticatedUserTO(
            id = user.id,
            name = user.name,
            roleNames = platformRoles,
            permissionNames = platformPermissions,
            tenantMemberships = membershipInfos,
            email = externalIdentity.email?.trim()?.lowercase(),
            emailVerified = externalIdentity.emailVerified,
        )
    }

    private fun createUserAndIdentity(
        issuer: String,
        subject: String,
        accessToken: String?,
    ): AuthenticatedUserTO? {
        // Try to fetch profile from OIDC provider for a better user name
        val profile = accessToken?.let { profileFetcher.fetchProfile(it) }
        val userName = generateUniqueUserName(issuer, subject, profile)

        val user = User(name = userName)
        user.enable()

        // Set nick from profile data if available
        if (profile != null) {
            val nick = profile.displayName ?: profile.email ?: userName
            user.updateProfile(newSex = null, newAge = null, newNick = nick)
        }

        val savedUser = userRepository.save(user)

        val externalIdentity =
            ExternalIdentity(
                issuer = issuer,
                subject = subject,
                user = savedUser,
                provider = extractProvider(subject),
                email = profile?.email,
                emailVerified = profile?.emailVerified ?: false,
                displayName = profile?.displayName,
                pictureUrl = profile?.pictureUrl,
            )
        externalIdentityRepository.save(externalIdentity)

        log.info("Created new user ${savedUser.id} (name=$userName) from issuer=$issuer")

        return AuthenticatedUserTO(
            id = savedUser.id,
            name = savedUser.name,
            roleNames = emptySet(),
            permissionNames = emptySet(),
            tenantMemberships = emptyList(),
            email = externalIdentity.email?.trim()?.lowercase(),
            emailVerified = externalIdentity.emailVerified,
        )
    }

    /**
     * Generate a unique local user name by checking against existing names.
     * If the preferred name is taken, appends a numeric suffix.
     */
    private fun generateUniqueUserName(
        issuer: String,
        subject: String,
        profile: OidcUserProfileFetcher.Profile?,
    ): String {
        val preferred = generateLocalUserName(issuer, subject, profile)
        if (!userRepository.existsByName(preferred)) {
            return preferred
        }

        // Preferred name is taken — fall back to hash-based name first
        val hashed = generateHashedUserName(issuer, subject)
        if (!userRepository.existsByName(hashed)) {
            return hashed
        }

        // Both taken (very unlikely) — append numeric suffix
        var suffix = 2
        while (true) {
            val candidate = "${hashed}_$suffix"
            if (!userRepository.existsByName(candidate)) {
                return candidate
            }
            suffix++
        }
    }

    /**
     * Generate a local user name. Prefer full email, then displayName, then hash.
     * Name allows letters, numbers, underscores, dots, at-signs and hyphens (5-50 chars).
     */
    private fun generateLocalUserName(
        issuer: String,
        subject: String,
        profile: OidcUserProfileFetcher.Profile?,
    ): String {
        // Try full email
        val email = profile?.email?.trim()
        if (!email.isNullOrBlank() && email.length in 5..50) {
            return email
        }

        // Try displayName (sanitized)
        val displayName = profile?.displayName?.trim()
        if (!displayName.isNullOrBlank()) {
            val sanitized = sanitizeUserName(displayName)
            if (sanitized != null) return sanitized
        }

        // Fallback: SHA-256 hash
        return generateHashedUserName(issuer, subject)
    }

    /**
     * Sanitize a string to satisfy ^[a-zA-Z0-9_]*$, 5-50 chars.
     * Returns null if the result would be too short or empty.
     */
    private fun sanitizeUserName(input: String): String? {
        val sanitized =
            input
                .replace(Regex("[^a-zA-Z0-9_]"), "_") // Replace invalid chars with underscore
                .replace(Regex("_+"), "_") // Collapse multiple underscores
                .trim('_') // Remove leading/trailing underscores
        if (sanitized.length < 5 || sanitized.length > 50) return null
        return sanitized
    }

    private fun generateHashedUserName(
        issuer: String,
        subject: String,
    ): String {
        val digest =
            MessageDigest
                .getInstance("SHA-256")
                .digest("$issuer|$subject".toByteArray())
                .joinToString("") { "%02x".format(it) }
        return "oidc_${digest.take(24)}"
    }

    private fun extractProvider(subject: String): String? {
        val pipeIndex = subject.indexOf('|')
        return if (pipeIndex > 0) subject.substring(0, pipeIndex) else null
    }
}
