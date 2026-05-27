package org.abacusflow.usecase.feedback.mapper

import org.abacusflow.feedback.Feedback
import org.abacusflow.usecase.feedback.BasicFeedbackTO
import org.abacusflow.usecase.feedback.FeedbackTO

fun Feedback.toTO() =
    FeedbackTO(
        id = id,
        category = category.name,
        status = status.name,
        source = source.name,
        title = title,
        description = description,
        pagePath = context.pagePath,
        appVersion = context.appVersion,
        platform = context.platform,
        deviceInfo = context.deviceInfo,
        errorContext = context.errorContext,
        contact = reporter.contact,
        allowContact = reporter.allowContact,
        reporterUserId = reporterUserId,
        assigneeUserId = assigneeUserId,
        resolutionNote = resolutionNote,
        resolvedAt = resolvedAt,
        createdAt = createdAt,
        updatedAt = updatedAt,
        imageUrls = imageUrls.toList(),
    )

fun Feedback.toBasicTO() =
    BasicFeedbackTO(
        id = id,
        category = category.name,
        status = status.name,
        source = source.name,
        title = title,
        description = description,
        pagePath = context.pagePath,
        reporterUserId = reporterUserId,
        assigneeUserId = assigneeUserId,
        createdAt = createdAt,
        imageUrls = imageUrls.toList(),
    )
