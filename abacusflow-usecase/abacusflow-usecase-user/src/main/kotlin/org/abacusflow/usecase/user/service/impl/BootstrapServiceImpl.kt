package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.usecase.user.BootstrapResultTO
import org.abacusflow.usecase.user.service.BootstrapService
import org.abacusflow.user.ExternalIdentity
import org.abacusflow.user.User
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class BootstrapServiceImpl(
    private val externalIdentityRepository: ExternalIdentityRepository,
) : BootstrapService {
    override fun bootstrap(
        issuer: String,
        subject: String,
        email: String?,
        emailVerified: Boolean?,
        displayName: String?,
        pictureUrl: String?,
    ): BootstrapResultTO {
        val externalIdentity =
            externalIdentityRepository.findByIssuerAndSubject(issuer, subject)
                ?: throw IllegalStateException(
                    "ExternalIdentity not found for issuer=$issuer subject=$subject. " +
                        "User should have been auto-created during authentication.",
                )

        val user = externalIdentity.user

        externalIdentity.syncProfile(email, emailVerified, displayName, pictureUrl)
        externalIdentity.recordLogin()
        externalIdentityRepository.save(externalIdentity)

        val nick = displayName ?: email ?: user.name
        user.updateProfile(newSex = null, newAge = null, newNick = nick)

        if (user.locked) {
            return buildResult(user, externalIdentity, BootstrapResultTO.UserStatus.LOCKED)
        }

        return buildResult(user, externalIdentity, BootstrapResultTO.UserStatus.ACTIVE)
    }

    private fun buildResult(
        user: User,
        identity: ExternalIdentity,
        status: BootstrapResultTO.UserStatus,
    ): BootstrapResultTO {
        val roles = user.roles.map { it.name }
        val permissions = user.roles.flatMap { role -> role.permissions.map { it.name } }.distinct()
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
        )
    }
}
