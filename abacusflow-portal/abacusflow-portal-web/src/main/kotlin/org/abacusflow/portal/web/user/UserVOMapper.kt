package org.abacusflow.portal.web.user

import org.abacusflow.portal.web.model.BasicUserVO
import org.abacusflow.portal.web.model.SexVO
import org.abacusflow.portal.web.model.SexVO.female
import org.abacusflow.portal.web.model.SexVO.male
import org.abacusflow.portal.web.model.UserVO
import org.abacusflow.usecase.user.BasicUserTO
import org.abacusflow.usecase.user.UserTO

fun UserTO.toVO(): UserVO =
    UserVO(
        id = id,
        name = name,
        age = age,
        nick = nick,
        enabled = enabled,
        locked = locked,
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli(),
        sex = sex?.let { mapSexTOToVO(it) },
    )

fun BasicUserTO.toBasicVO(): BasicUserVO =
    BasicUserVO(
        id,
        name,
        nick,
        enabled,
        locked,
    )

fun SexVO.toTO(): String =
    when (this) {
        male -> "M"
        female -> "F"
    }

private fun mapSexTOToVO(sex: String): SexVO =
    when (sex.uppercase()) {
        "M" -> SexVO.male
        "F" -> SexVO.female
        else -> throw NoSuchElementException("SexVO $sex not found")
    }
