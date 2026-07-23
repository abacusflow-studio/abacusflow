package org.abacusflow.migration.report

import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import java.time.Duration

/** 进度输出端口；业务任务只发事件，不负责日志排版或 ETA 计算。 */
interface ProgressReporter {
    fun taskStarted(
        taskId: MigrationTaskId,
        estimatedTotal: Long?,
    )

    fun batchCompleted(
        taskId: MigrationTaskId,
        processedCount: Long,
        elapsed: Duration,
    )

    fun taskCompleted(result: TaskResult)
}

/** TODO(实现者)：实现 records/s、ETA、结构化日志，并避免每条记录打印日志。 */
class ConsoleProgressReporter : ProgressReporter {
    override fun taskStarted(
        taskId: MigrationTaskId,
        estimatedTotal: Long?,
    ) = Unit

    override fun batchCompleted(
        taskId: MigrationTaskId,
        processedCount: Long,
        elapsed: Duration,
    ) = Unit

    override fun taskCompleted(result: TaskResult) = Unit
}
