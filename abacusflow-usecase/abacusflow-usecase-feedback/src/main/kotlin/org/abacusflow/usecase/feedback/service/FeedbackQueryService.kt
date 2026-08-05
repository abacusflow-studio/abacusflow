package org.abacusflow.usecase.feedback.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.feedback.BasicFeedbackTO
import org.abacusflow.usecase.feedback.FeedbackTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize

interface FeedbackQueryService {
    @PreAuthorize(RequiredAuthority.BUSINESS_FEEDBACK_READ)
    fun listFeedbacksPage(
        pageable: Pageable,
        status: String?,
        source: String?,
        category: String?,
    ): Page<BasicFeedbackTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_FEEDBACK_READ)
    fun getFeedback(id: Long): FeedbackTO
}
