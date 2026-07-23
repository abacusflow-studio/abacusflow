package org.abacusflow.migration.error

import org.abacusflow.migration.framework.MigrationTaskId
import java.time.Instant
import java.util.UUID

data class MigrationError(
    val runId: UUID,
    val taskId: MigrationTaskId,
    val stream: String,
    val recordKey: String,
    val message: String,
    val retryable: Boolean,
    val createdAt: Instant,
)

/** 可重试错误记录端口，不允许落密码或完整个人数据。 */
fun interface MigrationErrorRepository {
    fun record(error: MigrationError)
}
