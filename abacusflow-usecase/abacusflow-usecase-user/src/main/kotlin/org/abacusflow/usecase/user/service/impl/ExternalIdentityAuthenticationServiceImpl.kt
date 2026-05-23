package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.ExternalIdentityRepository
import org.abacusflow.usecase.user.AuthenticatedUserTO
import org.abacusflow.usecase.user.service.ExternalIdentityAuthenticationService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class ExternalIdentityAuthenticationServiceImpl(
    private val externalIdentityRepository: ExternalIdentityRepository,
) : ExternalIdentityAuthenticationService {
    override fun resolveAuthorizedUser(
        issuer: String,
        subject: String,
    ): AuthenticatedUserTO? {
        val user =
            externalIdentityRepository.findByIssuerAndSubject(issuer, subject)?.user
                ?: return null

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
}
