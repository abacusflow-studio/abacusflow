package org.abacusflow.usecase.user

import java.time.Instant

data class BasicUserTO(
    val id: Long,
    val name: String,
    val nick: String,
    val sex: String?,
    val age: Int,
    val enabled: Boolean,
    val locked: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)
