package org.abacusflow.migration.checkpoint

import org.abacusflow.migration.framework.MigrationTaskId
import org.jooq.DSLContext
import java.time.Instant
import java.util.UUID

/** stream 解决复合任务/复合主键无法只用 last_processed_id 表达的问题。 */
data class CheckpointKey(
    val taskId: MigrationTaskId,
    val stream: String = "default",
)

data class MigrationCheckpoint(
    val key: CheckpointKey,
    val cursor: String?,
    val processedCount: Long,
    val runId: UUID,
    val implementationVersion: Int,
    val updatedAt: Instant,
)

/** 控制表仓储。save 必须使用业务批次传入的 transaction，保证原子提交。 */
interface MigrationCheckpointRepository {
    fun find(key: CheckpointKey): MigrationCheckpoint?

    fun save(
        transaction: DSLContext,
        checkpoint: MigrationCheckpoint,
    )
}
