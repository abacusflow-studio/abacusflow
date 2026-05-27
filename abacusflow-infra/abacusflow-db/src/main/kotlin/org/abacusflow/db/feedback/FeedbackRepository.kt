package org.abacusflow.db.feedback

import org.abacusflow.feedback.Feedback
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.stereotype.Repository

@Repository
interface FeedbackRepository : JpaRepository<Feedback, Long>, JpaSpecificationExecutor<Feedback>
