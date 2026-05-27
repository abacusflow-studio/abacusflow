package org.abacusflow.usecase.feedback.service

import org.abacusflow.usecase.feedback.CreateFeedbackInputTO
import org.abacusflow.usecase.feedback.FeedbackTO
import org.abacusflow.usecase.feedback.UpdateFeedbackInputTO

interface FeedbackCommandService {
    fun createFeedback(input: CreateFeedbackInputTO): FeedbackTO

    fun updateFeedback(
        id: Long,
        input: UpdateFeedbackInputTO,
    ): FeedbackTO
}
