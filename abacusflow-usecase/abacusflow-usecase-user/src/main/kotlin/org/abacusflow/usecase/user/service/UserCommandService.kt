package org.abacusflow.usecase.user.service

import org.abacusflow.usecase.user.CreateUserInputTO
import org.abacusflow.usecase.user.UpdateUserInputTO
import org.abacusflow.usecase.user.UserTO
import org.springframework.security.access.prepost.PreAuthorize

interface UserCommandService {
    @PreAuthorize("hasAuthority('user:manage')")
    fun createUser(input: CreateUserInputTO): UserTO

    @PreAuthorize("hasAuthority('user:manage')")
    fun updateUser(
        id: Long,
        input: UpdateUserInputTO,
    ): UserTO

    @PreAuthorize("hasAuthority('user:manage')")
    fun deleteUser(id: Long): UserTO
}
