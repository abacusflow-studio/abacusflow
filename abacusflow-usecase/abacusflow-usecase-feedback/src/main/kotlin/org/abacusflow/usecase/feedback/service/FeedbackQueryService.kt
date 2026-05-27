package org.abacusflow.usecase.feedback.service

import org.abacusflow.usecase.feedback.BasicFeedbackTO
import org.abacusflow.usecase.feedback.FeedbackTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

interface FeedbackQueryService {
    fun listFeedbacksPage(
        pageable: Pageable,
        status: String?,
        source: String?,
        category: String?,
    ): Page<BasicFeedbackTO>

    fun getFeedback(id: Long): FeedbackTO
}
