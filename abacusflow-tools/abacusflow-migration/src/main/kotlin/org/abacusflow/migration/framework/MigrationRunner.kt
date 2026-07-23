package org.abacusflow.migration.framework

import java.time.Duration
import java.time.Instant
import java.util.UUID

/**
 * 顶层编排器。职责仅限计划解析、任务状态转换、失败停止策略、报告汇总与资源边界。
 * 批处理、SQL 和字段转换应留在各任务/适配器中。
 */
class MigrationRunner(
    private val plan: MigrationPlan,
) {
    fun run(
        context: MigrationContext,
        selection: MigrationSelection,
    ): MigrationReport = throw UnsupportedOperationException("Implement migration orchestration")
}

data class MigrationReport(
    val runId: UUID,
    val startedAt: Instant,
    val duration: Duration,
    val taskResults: List<TaskResult>,
)
