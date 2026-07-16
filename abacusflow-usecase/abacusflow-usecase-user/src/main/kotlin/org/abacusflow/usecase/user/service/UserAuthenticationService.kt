package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.BootstrapResultTO
import org.abacusflow.usecase.user.CurrentUserTO

interface UserAuthenticationService {
    fun bootstrap(
        issuer: String,
        subject: String,
        accessToken: String,
    ): BootstrapResultTO

    fun getCurrentUser(
        issuer: String,
        subject: String,
    ): CurrentUserTO?
}
