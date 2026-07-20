package org.abacusflow.usecase.user.service.impl

import org.abacusflow.commons.Sex
import org.abacusflow.db.user.PlatformUserRoleRepository
import org.abacusflow.db.user.UserRepository
import org.abacusflow.usecase.commons.security.PermissionNames
import org.abacusflow.usecase.user.CreateUserInputTO
import org.abacusflow.usecase.user.UpdateUserInputTO
import org.abacusflow.usecase.user.UserTO
import org.abacusflow.usecase.user.mapper.toTO
import org.abacusflow.usecase.user.service.UserCommandService
import org.abacusflow.user.User
import org.abacusflow.user.UserPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class UserCommandServiceImpl(
    private val userRepository: UserRepository,
    private val userPasswordEncoder: UserPasswordEncoder,
    private val platformUserRoleRepository: PlatformUserRoleRepository,
) : UserCommandService {
    override fun createUser(input: CreateUserInputTO): UserTO {
        val newUser = User(name = input.name)
        newUser.updateProfile(
            newSex = input.sex?.let { Sex.valueOf(it) },
            newAge = input.age,
            newNick = input.nick,
        )
        newUser.resetPassword(userPasswordEncoder)
        return userRepository.save(newUser).toTO()
    }

    override fun updateUser(
        id: Long,
        input: UpdateUserInputTO,
    ): UserTO {
        val user = userRepository.findById(id).orElseThrow { NoSuchElementException("User not found") }
        user.updateProfile(
            newSex = input.sex?.let { Sex.valueOf(it) },
            newAge = input.age,
            newNick = input.nick,
        )
        return userRepository.save(user).toTO()
    }

    override fun deleteUser(id: Long): UserTO {
        val user = userRepository.findById(id).orElseThrow { NoSuchElementException("User not found") }
        val removesActivePlatformAdministrator =
            user.enabled && !user.locked &&
                platformUserRoleRepository.findAllByUserId(id).any { assignment ->
                    assignment.role.permissions.any { it.name == PermissionNames.Platform.ROLE_MANAGE }
                }
        if (removesActivePlatformAdministrator) {
            require(
                platformUserRoleRepository.countActiveUsersWithPermission(
                    PermissionNames.Platform.ROLE_MANAGE,
                ) > 1,
            ) { "Cannot delete the final active platform administrator" }
        }
        userRepository.delete(user)
        return user.toTO()
    }
}
