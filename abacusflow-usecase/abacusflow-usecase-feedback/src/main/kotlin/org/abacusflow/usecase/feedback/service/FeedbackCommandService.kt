package org.abacusflow.usecase.feedback.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.feedback.CreateFeedbackInputTO
import org.abacusflow.usecase.feedback.FeedbackTO
import org.abacusflow.usecase.feedback.UpdateFeedbackInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface FeedbackCommandService {
    @PreAuthorize(RequiredAuthority.BUSINESS_FEEDBACK_CREATE)
    fun createFeedback(input: CreateFeedbackInputTO): FeedbackTO

    @PreAuthorize(RequiredAuthority.BUSINESS_FEEDBACK_UPDATE)
    fun updateFeedback(
        id: Long,
        input: UpdateFeedbackInputTO,
    ): FeedbackTO
}
