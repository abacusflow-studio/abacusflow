package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.BootstrapResultTO

interface BootstrapService {
    fun bootstrap(
        issuer: String,
        subject: String,
        email: String?,
        emailVerified: Boolean?,
        displayName: String?,
        pictureUrl: String?,
    ): BootstrapResultTO
}
