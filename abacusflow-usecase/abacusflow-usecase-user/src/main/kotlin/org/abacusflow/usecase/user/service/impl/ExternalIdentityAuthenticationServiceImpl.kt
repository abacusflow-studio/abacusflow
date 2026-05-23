package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.db.user.UserRepository
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
) : ExternalIdentityAuthenticationService {
    override fun resolveAuthorizedUser(
        issuer: String,
        subject: String,
        email: String?,
        displayName: String?,
    ): AuthenticatedUserTO? {
        val user =
            externalIdentityRepository.findByIssuerAndSubject(issuer, subject)?.user
                ?: run {
                    registerPendingIdentity(issuer, subject, email, displayName)
                    return null
                }

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

    private fun registerPendingIdentity(
        issuer: String,
        subject: String,
        email: String?,
        displayName: String?,
    ): User {
        val user =
            User(name = generateLocalUserName(issuer, subject)).apply {
                updateProfile(
                    newSex = null,
                    newAge = null,
                    newNick = displayName ?: email ?: name,
                )
            }
        val savedUser = userRepository.save(user)
        externalIdentityRepository.save(
            ExternalIdentity(
                issuer = issuer,
                subject = subject,
                user = savedUser,
                email = email,
                displayName = displayName,
            ),
        )
        return savedUser
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
}
