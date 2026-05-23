package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.AuthenticatedUserTO

interface ExternalIdentityAuthenticationService {
    fun resolveAuthorizedUser(
        issuer: String,
        subject: String,
        email: String? = null,
        displayName: String? = null,
    ): AuthenticatedUserTO?
}
