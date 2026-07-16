package org.abacusflow.usecase.feedback.service

import org.abacusflow.usecase.feedback.CreateFeedbackInputTO
import org.abacusflow.usecase.feedback.FeedbackTO
import org.abacusflow.usecase.feedback.UpdateFeedbackInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface FeedbackCommandService {
    @PreAuthorize("hasAuthority('feedback:create')")
    fun createFeedback(input: CreateFeedbackInputTO): FeedbackTO

    @PreAuthorize("hasAuthority('feedback:update')")
    fun updateFeedback(
        id: Long,
        input: UpdateFeedbackInputTO,
    ): FeedbackTO
}
