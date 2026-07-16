package org.abacusflow.db.feedback

import org.abacusflow.feedback.Feedback
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 反馈 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 */
@Repository
interface FeedbackRepository : JpaRepository<Feedback, Long>
