package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.tenant.TenantMembershipRepository
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.tenant.MembershipStatus
import org.abacusflow.usecase.user.AuthenticatedUserTO
import org.abacusflow.usecase.user.service.ExternalIdentityAuthenticationService
import org.abacusflow.user.ExternalIdentity
import org.abacusflow.user.User
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
) : ExternalIdentityAuthenticationService {

    override fun resolveAuthorizedUser(
        issuer: String,
        subject: String,
    ): AuthenticatedUserTO? {
        val externalIdentity = externalIdentityRepository.findByIssuerAndSubject(issuer, subject)

        if (externalIdentity != null) {
            return buildAuthenticatedUser(externalIdentity)
        }

        return createUserAndIdentity(issuer, subject)
    }

    private fun buildAuthenticatedUser(externalIdentity: ExternalIdentity): AuthenticatedUserTO? {
        val user = externalIdentity.user

        if (!user.enabled || user.locked) {
            return null
        }

        val memberships = tenantMembershipRepository.findByUserIdAndStatus(user.id, MembershipStatus.ACTIVE)
        val membershipInfos = memberships.map { membership ->
            val tenant = tenantRepository.findById(membership.tenantId).orElse(null)
            AuthenticatedUserTO.TenantMembershipInfo(
                tenantId = membership.tenantId,
                tenantName = tenant?.name ?: "",
                tenantDisplayName = tenant?.displayName,
                roleNames = membership.roles.map { it.name }.toSet(),
                permissionNames = membership.roles.flatMap { it.permissions }.map { it.name }.toSet(),
            )
        }

        // Resolve roles/permissions from tenant memberships:
        // - If user has exactly one active membership, use that membership's roles/permissions
        // - If user has multiple, use the first membership's roles (tenant context will be resolved by TenantContextFilter)
        // - If user has no memberships (new user), return empty roles/permissions (needs onboarding)
        val resolvedRoles: Set<String>
        val resolvedPermissions: Set<String>

        if (membershipInfos.size == 1) {
            resolvedRoles = membershipInfos[0].roleNames
            resolvedPermissions = membershipInfos[0].permissionNames
        } else if (membershipInfos.size > 1) {
            // For multi-tenant users, use empty roles at JWT level.
            // The TenantContextFilter will set the tenant, and the actual
            // role/permission checks will happen per-request based on the selected tenant.
            resolvedRoles = emptySet()
            resolvedPermissions = emptySet()
        } else {
            resolvedRoles = emptySet()
            resolvedPermissions = emptySet()
        }

        return AuthenticatedUserTO(
            id = user.id,
            name = user.name,
            roleNames = resolvedRoles,
            permissionNames = resolvedPermissions,
            tenantMemberships = membershipInfos,
        )
    }

    private fun createUserAndIdentity(
        issuer: String,
        subject: String,
    ): AuthenticatedUserTO? {
        val user = User(name = generateLocalUserName(issuer, subject))
        user.enable()

        // New user gets no roles — they will need to create/join a tenant (onboarding)
        val savedUser = userRepository.save(user)

        val externalIdentity =
            ExternalIdentity(
                issuer = issuer,
                subject = subject,
                user = savedUser,
                provider = extractProvider(subject),
            )
        externalIdentityRepository.save(externalIdentity)

        return AuthenticatedUserTO(
            id = savedUser.id,
            name = savedUser.name,
            roleNames = emptySet(),
            permissionNames = emptySet(),
            tenantMemberships = emptyList(),
        )
    }

    private fun generateLocalUserName(
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
