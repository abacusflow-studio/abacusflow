package org.abacusflow.portal.web.feedback

import org.abacusflow.portal.web.api.FeedbackApi
import org.abacusflow.portal.web.feedback.mapper.toBasicVO
import org.abacusflow.portal.web.feedback.mapper.toVO
import org.abacusflow.portal.web.model.CreateFeedbackInputVO
import org.abacusflow.portal.web.model.FeedbackCategoryVO
import org.abacusflow.portal.web.model.FeedbackSourceVO
import org.abacusflow.portal.web.model.FeedbackStatusVO
import org.abacusflow.portal.web.model.FeedbackVO
import org.abacusflow.portal.web.model.ListFeedbackPage200ResponseVO
import org.abacusflow.portal.web.model.UpdateFeedbackInputVO
import org.abacusflow.usecase.feedback.CreateFeedbackInputTO
import org.abacusflow.usecase.feedback.UpdateFeedbackInputTO
import org.abacusflow.usecase.feedback.service.FeedbackCommandService
import org.abacusflow.usecase.feedback.service.FeedbackQueryService
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.RestController

@RestController
class FeedbackController(
    private val feedbackCommandService: FeedbackCommandService,
    private val feedbackQueryService: FeedbackQueryService,
) : FeedbackApi {
    @PreAuthorize("hasAuthority('feedback:create')")
    override fun createFeedback(createFeedbackInputVO: CreateFeedbackInputVO): ResponseEntity<FeedbackVO> {
        val feedback =
            feedbackCommandService.createFeedback(
                CreateFeedbackInputTO(
                    category = createFeedbackInputVO.category.name,
                    source = createFeedbackInputVO.source.name,
                    title = createFeedbackInputVO.title,
                    description = createFeedbackInputVO.description,
                    contact = createFeedbackInputVO.contact,
                    allowContact = createFeedbackInputVO.allowContact,
                    pagePath = createFeedbackInputVO.pagePath,
                    appVersion = createFeedbackInputVO.appVersion,
                    platform = createFeedbackInputVO.platform,
                    deviceInfo = createFeedbackInputVO.deviceInfo,
                    errorContext = createFeedbackInputVO.errorContext,
                    reporterUserId = null,
                ),
            )
        return ResponseEntity.ok(feedback.toVO())
    }

    @PreAuthorize("hasAuthority('feedback:read')")
    override fun listFeedbackPage(
        pageIndex: Int,
        pageSize: Int,
        status: FeedbackStatusVO?,
        source: FeedbackSourceVO?,
        category: FeedbackCategoryVO?,
    ): ResponseEntity<ListFeedbackPage200ResponseVO> {
        val pageable = PageRequest.of(pageIndex - 1, pageSize)

        val page =
            feedbackQueryService.listFeedbacksPage(
                pageable,
                status = status?.name,
                source = source?.name,
                category = category?.name,
            ).map { it.toBasicVO() }

        val pageVO =
            ListFeedbackPage200ResponseVO(
                content = page.content,
                totalElements = page.totalElements,
                number = page.number,
                propertySize = page.size,
            )

        return ResponseEntity.ok(pageVO)
    }

    @PreAuthorize("hasAuthority('feedback:read')")
    override fun getFeedback(id: Long): ResponseEntity<FeedbackVO> {
        val feedback = feedbackQueryService.getFeedback(id)
        return ResponseEntity.ok(feedback.toVO())
    }

    @PreAuthorize("hasAuthority('feedback:update')")
    override fun updateFeedback(
        id: Long,
        updateFeedbackInputVO: UpdateFeedbackInputVO,
    ): ResponseEntity<FeedbackVO> {
        val feedback =
            feedbackCommandService.updateFeedback(
                id,
                UpdateFeedbackInputTO(
                    action = updateFeedbackInputVO.action?.name,
                    assigneeUserId = updateFeedbackInputVO.assigneeUserId,
                    resolutionNote = updateFeedbackInputVO.resolutionNote,
                ),
            )
        return ResponseEntity.ok(feedback.toVO())
    }
}
