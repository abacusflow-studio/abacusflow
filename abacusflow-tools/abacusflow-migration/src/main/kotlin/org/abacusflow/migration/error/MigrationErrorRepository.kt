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

/**
 * 错误记录端口。recordKey 可表示单 ID 或复合键，但不得保存密码、完整个人数据或 SQL 参数快照。
 */
fun interface MigrationErrorRepository {
    fun record(error: MigrationError)
}
