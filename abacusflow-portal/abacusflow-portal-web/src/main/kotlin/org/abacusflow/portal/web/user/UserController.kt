package org.abacusflow.portal.web.user

import org.abacusflow.portal.web.api.NotFoundException
import org.abacusflow.portal.web.api.UsersApi
import org.abacusflow.portal.web.model.BasicUserVO
import org.abacusflow.portal.web.model.CreateUserInputVO
import org.abacusflow.portal.web.model.UpdateUserInputVO
import org.abacusflow.portal.web.model.UserVO
import org.abacusflow.usecase.user.CreateUserInputTO
import org.abacusflow.usecase.user.UpdateUserInputTO
import org.abacusflow.usecase.user.service.UserCommandService
import org.abacusflow.usecase.user.service.UserQueryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class UserController(
    private val userCommandService: UserCommandService,
    private val userQueryService: UserQueryService,
) : UsersApi {
    override fun listBasicUsers(): ResponseEntity<List<BasicUserVO>> {
        val userVOS =
            userQueryService.listBasicUsers().map { user ->
                user.toBasicVO()
            }
        return ResponseEntity.ok(userVOS)
    }

    override fun getUser(id: Long): ResponseEntity<UserVO> {
        val user = userQueryService.getUser(id) ?: throw NotFoundException("User with id $id not found")
        return ResponseEntity.ok(
            user.toVO(),
        )
    }

    override fun addUser(createUserInputVO: CreateUserInputVO): ResponseEntity<UserVO> {
        val user =
            userCommandService.createUser(
                CreateUserInputTO(
                    createUserInputVO.name,
                    createUserInputVO.nick,
                    createUserInputVO.sex?.toTO(),
                    createUserInputVO.age,
                ),
            )
        return ResponseEntity.ok(
            user.toVO(),
        )
    }

    override fun updateUser(
        id: Long,
        updateUserInputVO: UpdateUserInputVO,
    ): ResponseEntity<UserVO> {
        val user =
            userCommandService.updateUser(
                id,
                UpdateUserInputTO(
                    nick = updateUserInputVO.nick,
                    sex = updateUserInputVO.sex?.toTO(),
                    age = updateUserInputVO.age,
                ),
            )
        return ResponseEntity.ok(
            user.toVO(),
        )
    }

    override fun deleteUser(id: Long): ResponseEntity<Unit> {
        userCommandService.deleteUser(id)
        return ResponseEntity.ok().build()
    }
}
