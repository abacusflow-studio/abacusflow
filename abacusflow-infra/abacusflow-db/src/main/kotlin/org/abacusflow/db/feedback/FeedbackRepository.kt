package org.abacusflow.db.feedback

import org.abacusflow.feedback.Feedback
import org.abacusflow.feedback.FeedbackCategory
import org.abacusflow.feedback.FeedbackSource
import org.abacusflow.feedback.FeedbackStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface FeedbackRepository : JpaRepository<Feedback, Long>, JpaSpecificationExecutor<Feedback> {
    @Query(
        """
        SELECT f FROM Feedback f
        WHERE (:status IS NULL OR f.status = :status)
          AND (:source IS NULL OR f.source = :source)
          AND (:category IS NULL OR f.category = :category)
        ORDER BY f.createdAt DESC
        """,
    )
    fun findAllFiltered(
        @Param("status") status: FeedbackStatus?,
        @Param("source") source: FeedbackSource?,
        @Param("category") category: FeedbackCategory?,
        pageable: Pageable,
    ): Page<Feedback>
}
