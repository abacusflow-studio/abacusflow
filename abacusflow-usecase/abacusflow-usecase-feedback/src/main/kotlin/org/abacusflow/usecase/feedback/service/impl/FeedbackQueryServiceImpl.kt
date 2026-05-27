package org.abacusflow.usecase.feedback.service.impl

import org.abacusflow.db.feedback.FeedbackRepository
import org.abacusflow.feedback.FeedbackCategory
import org.abacusflow.feedback.FeedbackSource
import org.abacusflow.feedback.FeedbackStatus
import org.abacusflow.usecase.feedback.BasicFeedbackTO
import org.abacusflow.usecase.feedback.FeedbackTO
import org.abacusflow.usecase.feedback.mapper.toBasicTO
import org.abacusflow.usecase.feedback.mapper.toTO
import org.abacusflow.usecase.feedback.service.FeedbackQueryService
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class FeedbackQueryServiceImpl(
    private val feedbackRepository: FeedbackRepository,
) : FeedbackQueryService {
    override fun listFeedbacksPage(
        pageable: Pageable,
        status: String?,
        source: String?,
        category: String?,
    ): Page<BasicFeedbackTO> {
        val feedbackStatus = status?.let { FeedbackStatus.valueOf(it) }
        val feedbackSource = source?.let { FeedbackSource.valueOf(it) }
        val feedbackCategory = category?.let { FeedbackCategory.valueOf(it) }

        return feedbackRepository
            .findAllFiltered(feedbackStatus, feedbackSource, feedbackCategory, pageable)
            .map { it.toBasicTO() }
    }

    override fun getFeedback(id: Long): FeedbackTO {
        val feedback =
            feedbackRepository.findById(id)
                .orElseThrow { NoSuchElementException("Feedback not found with id: $id") }
        return feedback.toTO()
    }
}
