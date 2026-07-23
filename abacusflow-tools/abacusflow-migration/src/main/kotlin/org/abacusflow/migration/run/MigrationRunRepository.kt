package org.abacusflow.migration.run

import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import java.time.Instant
import java.util.UUID

enum class MigrationRunStatus {
    RUNNING,
    SUCCEEDED,
    FAILED,
}

data class MigrationRun(
    val runId: UUID,
    val status: MigrationRunStatus,
    val selectedTasks: Set<MigrationTaskId>,
    val startedAt: Instant,
    val finishedAt: Instant?,
)

/**
 * 运行/任务状态控制面。实现应使用独立短事务，使失败状态不会随业务批次一起回滚。
 */
interface MigrationRunRepository {
    fun start(run: MigrationRun)

    fun taskStarted(
        runId: UUID,
        taskId: MigrationTaskId,
    )

    fun taskCompleted(
        runId: UUID,
        result: TaskResult,
    )

    fun finish(
        runId: UUID,
        status: MigrationRunStatus,
        finishedAt: Instant,
        message: String? = null,
    )
}
