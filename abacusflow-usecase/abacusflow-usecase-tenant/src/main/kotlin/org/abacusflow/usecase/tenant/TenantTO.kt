package org.abacusflow.usecase.tenant

import java.time.Instant

data class TenantTO(
    val id: Long,
    val name: String,
    val displayName: String?,
    val status: String,
    val createdAt: Instant,
    val updatedAt: Instant,
)
