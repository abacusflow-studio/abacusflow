package org.abacusflow.usecase.user.service.impl

import jakarta.annotation.PostConstruct
import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.db.user.RoleRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.usecase.user.AuthenticatedUserTO
import org.abacusflow.usecase.user.service.ExternalIdentityAuthenticationService
import org.abacusflow.user.ExternalIdentity
import org.abacusflow.user.Role
import org.abacusflow.user.User
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest

@Service
@Transactional
class ExternalIdentityAuthenticationServiceImpl(
    private val externalIdentityRepository: ExternalIdentityRepository,
    private val userRepository: UserRepository,
    private val roleRepository: RoleRepository,
) : ExternalIdentityAuthenticationService {
    private lateinit var viewerRole: Role

    @PostConstruct
    fun init() {
        initViewerRole()
    }

    private fun initViewerRole() {
        viewerRole = roleRepository.findByNameWithPermissions(DEFAULT_VIEWER_ROLE_NAME)
            ?: throw IllegalStateException(
                "Default role '$DEFAULT_VIEWER_ROLE_NAME' not found. Ensure RoleDataInitializer has run.",
            )
    }

    companion object {
        private const val DEFAULT_VIEWER_ROLE_NAME = "viewer"
    }

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

        return AuthenticatedUserTO(
            id = user.id,
            name = user.name,
            roleNames = user.roles.map { it.name }.toSet(),
            permissionNames =
                user.roles
                    .flatMap { it.permissions }
                    .map { it.name }
                    .toSet(),
        )
    }

    private fun createUserAndIdentity(
        issuer: String,
        subject: String,
    ): AuthenticatedUserTO? {
        val user = User(name = generateLocalUserName(issuer, subject))
        user.enable()

        user.addRole(viewerRole)

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
            roleNames = savedUser.roles.map { it.name }.toSet(),
            permissionNames =
                savedUser.roles
                    .flatMap { it.permissions }
                    .map { it.name }
                    .toSet(),
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
