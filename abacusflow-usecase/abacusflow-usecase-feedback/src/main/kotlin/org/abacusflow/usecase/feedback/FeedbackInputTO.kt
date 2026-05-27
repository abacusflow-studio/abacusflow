package org.abacusflow.usecase.feedback

data class CreateFeedbackInputTO(
    val category: String,
    val source: String,
    val title: String?,
    val description: String,
    val contact: String?,
    val allowContact: Boolean?,
    val pagePath: String?,
    val appVersion: String?,
    val platform: String?,
    val deviceInfo: String?,
    val errorContext: String?,
    val reporterUserId: Long?,
)

data class UpdateFeedbackInputTO(
    val action: String?,
    val assigneeUserId: Long?,
    val resolutionNote: String?,
)
