package org.abacusflow.usecase.feedback.service.impl

import org.abacusflow.feedback.Feedback
import org.abacusflow.feedback.FeedbackCategory
import org.abacusflow.feedback.FeedbackContext
import org.abacusflow.db.feedback.FeedbackRepository
import org.abacusflow.feedback.FeedbackSource
import org.abacusflow.feedback.Reporter
import org.abacusflow.usecase.feedback.CreateFeedbackInputTO
import org.abacusflow.usecase.feedback.FeedbackTO
import org.abacusflow.usecase.feedback.UpdateFeedbackInputTO
import org.abacusflow.usecase.feedback.mapper.toTO
import org.abacusflow.usecase.feedback.service.FeedbackCommandService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class FeedbackCommandServiceImpl(
    private val feedbackRepository: FeedbackRepository,
) : FeedbackCommandService {
    override fun createFeedback(input: CreateFeedbackInputTO): FeedbackTO {
        val feedback =
            Feedback(
                category = FeedbackCategory.valueOf(input.category),
                source = FeedbackSource.valueOf(input.source),
                title = input.title,
                description = input.description,
                context =
                    FeedbackContext(
                        pagePath = input.pagePath,
                        appVersion = input.appVersion,
                        platform = input.platform,
                        deviceInfo = input.deviceInfo,
                        errorContext = input.errorContext,
                    ),
                reporter =
                    Reporter(
                        contact = input.contact,
                        allowContact = input.allowContact ?: true,
                    ),
                reporterUserId = input.reporterUserId,
            )

        val saved = feedbackRepository.save(feedback)
        return saved.toTO()
    }

    override fun updateFeedback(
        id: Long,
        input: UpdateFeedbackInputTO,
    ): FeedbackTO {
        val feedback =
            feedbackRepository.findById(id)
                .orElseThrow { NoSuchElementException("Feedback not found with id: $id") }

        input.action?.let { action ->
            when (action) {
                "confirm" -> feedback.confirm()
                "startHandling" -> feedback.startHandling()
                "resolve" -> feedback.resolve(input.resolutionNote)
                "close" -> feedback.close()
                "reopen" -> feedback.reopen()
                else -> throw IllegalArgumentException("Unknown action: $action")
            }
        }

        input.assigneeUserId?.let { feedback.assignTo(it) }

        val saved = feedbackRepository.saveAndFlush(feedback)
        return saved.toTO()
    }
}
