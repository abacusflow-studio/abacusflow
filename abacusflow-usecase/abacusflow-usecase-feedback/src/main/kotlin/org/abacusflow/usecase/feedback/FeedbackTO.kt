package org.abacusflow.usecase.feedback

import java.time.Instant

data class FeedbackTO(
    val id: Long,
    val category: String,
    val status: String,
    val source: String,
    val title: String?,
    val description: String,
    val pagePath: String?,
    val appVersion: String?,
    val platform: String?,
    val deviceInfo: String?,
    val errorContext: String?,
    val contact: String?,
    val allowContact: Boolean,
    val reporterUserId: Long?,
    val assigneeUserId: Long?,
    val resolutionNote: String?,
    val resolvedAt: Instant?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class BasicFeedbackTO(
    val id: Long,
    val category: String,
    val status: String,
    val source: String,
    val title: String?,
    val description: String,
    val pagePath: String?,
    val reporterUserId: Long?,
    val assigneeUserId: Long?,
    val createdAt: Instant,
)
