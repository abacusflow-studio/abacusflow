package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.usecase.user.CurrentUserTO
import org.abacusflow.usecase.user.service.CurrentUserService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class CurrentUserServiceImpl(
    private val externalIdentityRepository: ExternalIdentityRepository,
) : CurrentUserService {
    override fun getCurrentUser(
        issuer: String,
        subject: String,
    ): CurrentUserTO? {
        val identity =
            externalIdentityRepository.findByIssuerAndSubject(issuer, subject)
                ?: return null

        val user = identity.user
        val roles = user.roles.map { it.name }
        val permissions = user.roles.flatMap { role -> role.permissions.map { it.name } }.distinct()

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
        )
    }
}
