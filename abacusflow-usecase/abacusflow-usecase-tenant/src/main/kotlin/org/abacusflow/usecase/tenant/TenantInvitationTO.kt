package org.abacusflow.usecase.tenant

import java.time.Instant

data class TenantInvitationTO(
    val id: Long,
    val tenantId: Long,
    val tenantName: String,
    val email: String,
    val roleIds: List<Long>,
    val roleNames: List<String>,
    val invitedByUserId: Long?,
    val token: String,
    val status: String,
    val expiresAt: Instant,
    val acceptedAt: Instant?,
    val createdAt: Instant,
)
