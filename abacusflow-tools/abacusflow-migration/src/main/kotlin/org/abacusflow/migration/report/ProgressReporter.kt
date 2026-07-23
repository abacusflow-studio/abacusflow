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

/** 控制台进度报告器：输出任务名、已处理数、速度和 ETA。 */
class ConsoleProgressReporter : ProgressReporter {
    private var lastPrintTime: Long = 0
    private val printIntervalMs: Long = 1000 // 最多每秒输出一次

    override fun taskStarted(
        taskId: MigrationTaskId,
        estimatedTotal: Long?,
    ) {
        val totalStr = estimatedTotal?.let { "/$it" } ?: ""
        println("[${taskId.cliName}] Starting$totalStr...")
    }

    override fun batchCompleted(
        taskId: MigrationTaskId,
        processedCount: Long,
        elapsed: Duration,
    ) {
        val now = System.currentTimeMillis()
        if (now - lastPrintTime < printIntervalMs) return
        lastPrintTime = now

        val seconds = elapsed.seconds
        val rate = if (seconds > 0) processedCount / seconds else processedCount
        print("\r[${taskId.cliName}] Processed: $processedCount ($rate rec/s)    ")
    }

    override fun taskCompleted(result: TaskResult) {
        println()
        println(
            "[${result.taskId.cliName}] Done. " +
                "Processed: ${result.processedCount}, " +
                "Skipped: ${result.skippedCount}, " +
                "Errors: ${result.errorCount}",
        )
    }
}
