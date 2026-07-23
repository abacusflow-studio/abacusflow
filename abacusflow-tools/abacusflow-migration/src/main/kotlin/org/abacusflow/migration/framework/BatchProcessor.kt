package org.abacusflow.migration.framework

import org.abacusflow.migration.checkpoint.CheckpointKey
import org.abacusflow.migration.checkpoint.MigrationCheckpoint
import org.jooq.DSLContext
import java.time.Instant

/**
 * 简化的批处理工具。使用 Long cursor (last_id) 的 keyset 分页。
 *
 * 正确的事务顺序：读 source → 转换 → target 事务内批量写入并更新 checkpoint。
 * source 查询不跨批持有事务；写失败时整批回滚，checkpoint 不前进。
 */
class BatchProcessor {
    /**
     * 执行 keyset 分页批处理循环。
     *
     * @param context 迁移上下文
     * @param checkpointKey checkpoint 键（taskId + stream）
     * @param implementationVersion 任务实现版本，变更时使旧 checkpoint 失效
     * @param readPage 从 source 读取一页数据。参数：(lastId, limit)，返回：(记录列表, 本页最大 ID)
     * @param transformAndWrite 在 target 事务中转换并写入。参数：(transaction DSLContext, 记录列表)，返回：实际写入数
     * @return 批处理结果
     */
    fun <T> processBatches(
        context: MigrationContext,
        checkpointKey: CheckpointKey,
        implementationVersion: Int = 1,
        readPage: (lastId: Long?, limit: Int) -> BatchPage<T>,
        transformAndWrite: (DSLContext, List<T>) -> Int,
    ): BatchResult {
        var lastId: Long? = loadCursor(context, checkpointKey)
        var totalProcessed = 0L
        var totalSkipped = 0L
        var totalErrors = 0L

        while (true) {
            // 1. 从 source 读取一页（不持有 source 事务）
            val page = readPage(lastId, context.options.batchSize)
            if (page.records.isEmpty()) break

            // 2. 在 target 事务中写入 + 保存 checkpoint
            try {
                context.target.transaction { dsl ->
                    val written = transformAndWrite(dsl, page.records)
                    totalSkipped += page.records.size - written

                    // 保存 checkpoint（与业务写入共享事务）
                    val newCursor = page.nextCursor?.toString()
                    context.checkpoints.save(
                        dsl,
                        MigrationCheckpoint(
                            key = checkpointKey,
                            cursor = newCursor,
                            processedCount = totalProcessed + page.records.size,
                            runId = context.runId,
                            implementationVersion = implementationVersion,
                            updatedAt = Instant.now(context.clock),
                        ),
                    )
                }
                totalProcessed += page.records.size
                lastId = page.nextCursor

                // 报告进度
                context.progress.batchCompleted(
                    checkpointKey.taskId,
                    totalProcessed,
                    java.time.Duration.ofMillis(0), // 由调用者计算
                )
            } catch (e: Exception) {
                // 整批回滚，checkpoint 不前进
                totalErrors += page.records.size
                context.errors.record(
                    org.abacusflow.migration.error.MigrationError(
                        runId = context.runId,
                        taskId = checkpointKey.taskId,
                        stream = checkpointKey.stream,
                        recordKey = "batch-after-$lastId",
                        message = e.message?.take(2000) ?: "Unknown error",
                        retryable = true,
                        createdAt = Instant.now(context.clock),
                    ),
                )
                if (context.options.failFast) throw e
            }
        }

        return BatchResult(
            lastCursor = lastId,
            processedCount = totalProcessed,
            skippedCount = totalSkipped,
            errorCount = totalErrors,
        )
    }

    /** 从 checkpoint 加载 cursor。 */
    private fun loadCursor(
        context: MigrationContext,
        key: CheckpointKey,
    ): Long? {
        // 需要在 target 读取 checkpoint
        var cursor: Long? = null
        context.target.read { dsl ->
            val checkpoint = context.checkpoints.find(dsl, key)
            cursor = checkpoint?.cursor?.toLongOrNull()
        }
        return cursor
    }
}

/** 一页读取结果。nextCursor 是本页最后一条记录的 ID。 */
data class BatchPage<T>(
    val records: List<T>,
    val nextCursor: Long?,
)

data class BatchResult(
    val lastCursor: Long?,
    val processedCount: Long,
    val skippedCount: Long = 0,
    val errorCount: Long = 0,
)
