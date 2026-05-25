package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.CurrentUserTO

interface CurrentUserService {
    fun getCurrentUser(issuer: String, subject: String): CurrentUserTO?
}
