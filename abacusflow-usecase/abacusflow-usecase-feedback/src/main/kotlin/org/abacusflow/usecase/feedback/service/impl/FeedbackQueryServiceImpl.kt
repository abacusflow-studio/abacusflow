package org.abacusflow.usecase.feedback.service.impl

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.abacusflow.db.feedback.FeedbackRepository
import org.abacusflow.generated.jooq.Tables.FEEDBACK
import org.abacusflow.generated.jooq.enums.FeedbackCategoryDbEnum
import org.abacusflow.generated.jooq.enums.FeedbackSourceDbEnum
import org.abacusflow.generated.jooq.enums.FeedbackStatusDbEnum
import org.abacusflow.usecase.feedback.BasicFeedbackTO
import org.abacusflow.usecase.feedback.FeedbackTO
import org.abacusflow.usecase.feedback.mapper.toTO
import org.abacusflow.usecase.feedback.service.FeedbackQueryService
import org.jooq.Condition
import org.jooq.DSLContext
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class FeedbackQueryServiceImpl(
    private val feedbackRepository: FeedbackRepository,
    private val jooqDsl: DSLContext,
    private val objectMapper: ObjectMapper,
) : FeedbackQueryService {
    override fun listFeedbacksPage(
        pageable: Pageable,
        status: String?,
        source: String?,
        category: String?,
    ): Page<BasicFeedbackTO> {
        val conditions =
            mutableListOf<Condition>().apply {
                status?.let { add(FEEDBACK.STATUS.eq(FeedbackStatusDbEnum.valueOf(it))) }
                source?.let { add(FEEDBACK.SOURCE.eq(FeedbackSourceDbEnum.valueOf(it))) }
                category?.let { add(FEEDBACK.CATEGORY.eq(FeedbackCategoryDbEnum.valueOf(it))) }
            }

        val total =
            jooqDsl
                .selectCount()
                .from(FEEDBACK)
                .where(conditions)
                .fetchOne(0, Long::class.java) ?: 0L

        val records =
            jooqDsl
                .select(
                    FEEDBACK.ID,
                    FEEDBACK.CATEGORY,
                    FEEDBACK.STATUS,
                    FEEDBACK.SOURCE,
                    FEEDBACK.TITLE,
                    FEEDBACK.DESCRIPTION,
                    FEEDBACK.PAGE_PATH,
                    FEEDBACK.REPORTER_USER_ID,
                    FEEDBACK.ASSIGNEE_USER_ID,
                    FEEDBACK.CREATED_AT,
                    FEEDBACK.IMAGE_URLS,
                ).from(FEEDBACK)
                .where(conditions)
                .orderBy(FEEDBACK.CREATED_AT.desc())
                .offset(pageable.offset)
                .limit(pageable.pageSize)
                .fetch()
                .map {
                    BasicFeedbackTO(
                        id = it[FEEDBACK.ID]!!,
                        category = it[FEEDBACK.CATEGORY]!!.literal,
                        status = it[FEEDBACK.STATUS]!!.literal,
                        source = it[FEEDBACK.SOURCE]!!.literal,
                        title = it[FEEDBACK.TITLE],
                        description = it[FEEDBACK.DESCRIPTION]!!,
                        pagePath = it[FEEDBACK.PAGE_PATH],
                        reporterUserId = it[FEEDBACK.REPORTER_USER_ID],
                        assigneeUserId = it[FEEDBACK.ASSIGNEE_USER_ID],
                        createdAt = it[FEEDBACK.CREATED_AT]!!.toInstant(),
                        imageUrls = it[FEEDBACK.IMAGE_URLS]?.data()?.let { json -> objectMapper.readValue<List<String>>(json) }
                            ?: emptyList(),
                    )
                }

        return PageImpl(records, pageable, total)
    }

    override fun getFeedback(id: Long): FeedbackTO {
        val feedback =
            feedbackRepository.findById(id)
                .orElseThrow { NoSuchElementException("Feedback not found with id: $id") }

        return feedback.toTO()
    }
}
