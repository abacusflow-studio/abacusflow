package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.BasicUserTO
import org.abacusflow.usecase.user.UserTO
import org.springframework.security.access.prepost.PreAuthorize

interface UserQueryService {
    @PreAuthorize("hasAuthority('user:read')")
    fun getUser(id: Long): UserTO?

    @PreAuthorize("hasAuthority('user:read')")
    fun getUser(name: String): UserTO?

    @PreAuthorize("hasAuthority('user:read')")
    fun listBasicUsers(): List<BasicUserTO>
}
