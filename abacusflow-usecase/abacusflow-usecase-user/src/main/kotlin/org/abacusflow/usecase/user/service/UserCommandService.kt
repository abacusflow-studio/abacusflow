package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.user.CreateUserInputTO
import org.abacusflow.usecase.user.UpdateUserInputTO
import org.abacusflow.usecase.user.UserTO
import org.springframework.security.access.prepost.PreAuthorize

interface UserCommandService {
    @PreAuthorize(RequiredAuthority.PLATFORM_USER_MANAGE)
    fun createUser(input: CreateUserInputTO): UserTO

    @PreAuthorize(RequiredAuthority.PLATFORM_USER_MANAGE)
    fun updateUser(
        id: Long,
        input: UpdateUserInputTO,
    ): UserTO

    @PreAuthorize(RequiredAuthority.PLATFORM_USER_MANAGE)
    fun deleteUser(id: Long): UserTO
}
