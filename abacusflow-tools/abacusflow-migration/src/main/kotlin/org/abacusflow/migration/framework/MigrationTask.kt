package org.abacusflow.migration.framework

/**
 * 一个可恢复的迁移任务。实现者必须保证重复执行安全（幂等或冲突策略明确）。
 * 任务内部可有多个 checkpoint stream，例如 product-category 与 product。
 */
interface MigrationTask {
    val id: MigrationTaskId
    val dependencies: Set<MigrationTaskId>

    fun execute(context: MigrationContext): TaskResult
}

data class TaskResult(
    val taskId: MigrationTaskId,
    val processedCount: Long,
    val skippedCount: Long = 0,
    val errorCount: Long = 0,
)
