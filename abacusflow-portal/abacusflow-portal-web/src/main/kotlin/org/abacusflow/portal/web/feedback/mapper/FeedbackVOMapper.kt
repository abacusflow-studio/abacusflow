package org.abacusflow.portal.web.feedback.mapper

import org.abacusflow.portal.web.model.BasicFeedbackVO
import org.abacusflow.portal.web.model.FeedbackCategoryVO
import org.abacusflow.portal.web.model.FeedbackSourceVO
import org.abacusflow.portal.web.model.FeedbackStatusVO
import org.abacusflow.portal.web.model.FeedbackVO
import org.abacusflow.usecase.feedback.BasicFeedbackTO
import org.abacusflow.usecase.feedback.FeedbackTO

fun FeedbackTO.toVO() =
    FeedbackVO(
        id = id,
        category = FeedbackCategoryVO.valueOf(category),
        status = FeedbackStatusVO.valueOf(status),
        source = FeedbackSourceVO.valueOf(source),
        title = title,
        description = description,
        pagePath = pagePath,
        appVersion = appVersion,
        platform = platform,
        deviceInfo = deviceInfo,
        errorContext = errorContext,
        contact = contact,
        allowContact = allowContact,
        reporterUserId = reporterUserId,
        assigneeUserId = assigneeUserId,
        resolutionNote = resolutionNote,
        resolvedAt = resolvedAt?.toEpochMilli(),
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli(),
    )

fun BasicFeedbackTO.toBasicVO() =
    BasicFeedbackVO(
        id = id,
        category = FeedbackCategoryVO.valueOf(category),
        status = FeedbackStatusVO.valueOf(status),
        source = FeedbackSourceVO.valueOf(source),
        title = title,
        description = description,
        pagePath = pagePath,
        reporterUserId = reporterUserId,
        assigneeUserId = assigneeUserId,
        createdAt = createdAt.toEpochMilli(),
    )
