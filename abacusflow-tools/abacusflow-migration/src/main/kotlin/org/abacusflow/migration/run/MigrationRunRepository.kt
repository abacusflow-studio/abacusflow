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
        message: String?,
    )
}
