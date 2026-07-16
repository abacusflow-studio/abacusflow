package org.abacusflow.usecase.user.mapper

import org.abacusflow.usecase.user.BasicUserTO
import org.abacusflow.usecase.user.UserTO
import org.abacusflow.user.User

fun User.toTO() =
    UserTO(
        id = id,
        name = name,
        sex = sex?.name,
        age = age,
        nick = nick,
        enabled = enabled,
        locked = locked,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )

fun User.toBasicTO() =
    BasicUserTO(
        id = id,
        name = name,
        nick = nick,
        sex = sex?.name,
        age = age,
        enabled = enabled,
        locked = locked,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )
