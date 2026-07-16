package org.abacusflow.usecase.user

import java.time.Instant

data class UserTO(
    val id: Long,
    val name: String,
    val sex: String?,
    val age: Int,
    val nick: String,
    val enabled: Boolean,
    val locked: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)
