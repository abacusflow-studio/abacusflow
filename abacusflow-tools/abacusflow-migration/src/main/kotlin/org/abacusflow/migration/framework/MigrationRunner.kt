package org.abacusflow.migration.framework

import io.github.oshai.kotlinlogging.KotlinLogging
import java.time.Duration
import java.time.Instant
import java.util.UUID

private val logger = KotlinLogging.logger {}

/**
 * 顶层编排器。职责仅限按固定顺序执行任务、失败策略、报告汇总与资源边界。
 * 批处理、SQL 和字段转换应留在各任务中。
 */
class MigrationRunner(
    private val plan: MigrationPlan,
) {
    fun run(
        context: MigrationContext,
        selection: MigrationSelection,
    ): MigrationReport {
        val startedAt = Instant.now(context.clock)
        val resolvedTasks = plan.resolve(selection)

        logger.info { "Migration run ${context.runId}: ${resolvedTasks.size} tasks selected" }

        // 记录运行开始
        context.runs.start(
            org.abacusflow.migration.run.MigrationRun(
                runId = context.runId,
                status = org.abacusflow.migration.run.MigrationRunStatus.RUNNING,
                selectedTasks = resolvedTasks.map { it.id }.toSet(),
                startedAt = startedAt,
                finishedAt = null,
            ),
        )

        val taskResults = mutableListOf<TaskResult>()
        var failed = false

        for (task in resolvedTasks) {
            if (failed && context.options.failFast) {
                logger.warn { "Skipping task ${task.id.cliName} due to previous failure (fail-fast)" }
                break
            }

            val taskStartedAt = Instant.now(context.clock)
            context.runs.taskStarted(context.runId, task.id)
            context.progress.taskStarted(task.id, null)

            try {
                val result = task.execute(context)
                context.runs.taskCompleted(context.runId, result)
                context.progress.taskCompleted(result)
                taskResults.add(result)

                logger.info {
                    "Task ${task.id.cliName} completed: processed=${result.processedCount}, " +
                        "skipped=${result.skippedCount}, errors=${result.errorCount}"
                }
            } catch (e: UnsupportedOperationException) {
                // 骨架任务未实现
                val failedResult =
                    TaskResult(
                        taskId = task.id,
                        processedCount = 0,
                        errorCount = 1,
                    )
                taskResults.add(failedResult)
                failed = true
                logger.error { "Task ${task.id.cliName} is not implemented: ${e.message}" }

                if (context.options.failFast) break
            } catch (e: Exception) {
                val failedResult =
                    TaskResult(
                        taskId = task.id,
                        processedCount = 0,
                        errorCount = 1,
                    )
                taskResults.add(failedResult)
                failed = true
                logger.error(e) { "Task ${task.id.cliName} failed" }

                if (context.options.failFast) break
            }
        }

        val finishedAt = Instant.now(context.clock)
        val finalStatus =
            if (failed) {
                org.abacusflow.migration.run.MigrationRunStatus.FAILED
            } else {
                org.abacusflow.migration.run.MigrationRunStatus.SUCCEEDED
            }
        context.runs.finish(context.runId, finalStatus, finishedAt, null)

        return MigrationReport(
            runId = context.runId,
            startedAt = startedAt,
            duration = Duration.between(startedAt, finishedAt),
            taskResults = taskResults,
        )
    }
}

data class MigrationReport(
    val runId: UUID,
    val startedAt: Instant,
    val duration: Duration,
    val taskResults: List<TaskResult>,
)
