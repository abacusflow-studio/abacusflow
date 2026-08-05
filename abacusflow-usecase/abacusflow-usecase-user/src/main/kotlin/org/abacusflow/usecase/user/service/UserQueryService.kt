package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.user.BasicUserTO
import org.abacusflow.usecase.user.UserTO
import org.springframework.security.access.prepost.PreAuthorize

interface UserQueryService {
    @PreAuthorize(RequiredAuthority.PLATFORM_USER_READ)
    fun getUser(id: Long): UserTO?

    @PreAuthorize(RequiredAuthority.PLATFORM_USER_READ)
    fun getUser(name: String): UserTO?

    @PreAuthorize(RequiredAuthority.PLATFORM_USER_READ)
    fun listBasicUsers(): List<BasicUserTO>
}
