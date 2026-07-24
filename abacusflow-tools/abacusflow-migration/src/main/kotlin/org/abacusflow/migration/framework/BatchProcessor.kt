package org.abacusflow.migration.framework

import org.abacusflow.migration.checkpoint.CheckpointKey
import org.abacusflow.migration.checkpoint.MigrationCheckpoint
import org.jooq.DSLContext
import java.time.Instant

/**
 * 批处理引擎 —— 迁移框架的核心执行单元。
 *
 * ## 设计目的
 * 大数据量迁移不能一次性加载全部记录到内存，必须分批处理。
 * BatchProcessor 封装了"分页读取 → 转换写入 → 保存断点"的循环逻辑，
 * 让各迁移任务只需关注"如何读一页"和"如何写一批"，不用重复编写分页和断点管理代码。
 *
 * ## Keyset 分页（游标分页）
 * 使用 `WHERE id > lastId ORDER BY id LIMIT batchSize` 的方式分页，
 * 而非传统的 `OFFSET/LIMIT` 分页。原因：
 * - **性能**：OFFSET 需要跳过前面所有行，数据量大时越来越慢（O(n)）；
 *   keyset 分页利用索引直接定位，每页都是 O(1)
 * - **一致性**：如果迁移过程中有数据插入，OFFSET 可能漏掉或重复；
 *   keyset 基于 ID 有序性，天然避免此问题
 * - **可恢复**：lastId 就是断点，重启后从断点继续即可
 *
 * ## 事务策略
 * 核心保证：**读源数据不持有事务，写目标数据在事务内完成**。
 * - 源库只读（readPage 不在事务内），避免长时间持有源库连接
 * - 目标库写入 + checkpoint 保存共享同一个事务
 * - 写入失败时整批回滚（包括 checkpoint），确保断点与数据一致
 * - 下次重试从同一断点重新开始，不会跳过或重复
 *
 * ## 与系统的连接
 * - 被 [MigrationTask] 的各实现类调用，传入 readPage 和 transformAndWrite 两个 lambda
 * - 通过 [MigrationContext] 获取数据库连接、checkpoint 仓库、进度报告器等
 * - [CheckpointKey] 标识本批处理的断点（任务 ID + 流名称）
 * - [BatchPage] 是 readPage 的返回类型，[BatchResult] 是整个批处理的汇总结果
 */
class BatchProcessor {
    /**
     * 执行 keyset 分页批处理循环。
     *
     * ## 执行流程
     * ```
     * while (true) {
     *     1. 从 checkpoint 加载 lastId（首次为 null，从头开始）
     *     2. 调用 readPage(lastId, batchSize) 从源库读取一页
     *     3. 如果记录为空，退出循环
     *     4. 在目标库事务中：
     *        a. 调用 transformAndWrite 转换并写入本批数据
     *        b. 保存 checkpoint（记录新的 lastId 和已处理总数）
     *     5. 事务成功 → 更新 lastId，继续下一页
     *        事务失败 → 记录错误，根据 failFast 决定是否抛出
     * }
     * ```
     *
     * ## Kotlin 泛型语法：`<T>`
     * 类型参数 T 代表源库记录的类型，由调用者决定。
     * 例如 ProductMigration 可能传入 ProductRow，UserMigration 传入 UserRow。
     * Kotlin 的泛型与 Java 类似，但做了类型推导优化——大多数场景不需要显式指定。
     *
     * ## Lambda 参数语法
     * Kotlin 的 lambda 可以作为函数参数传递，这里有两个 lambda：
     * - `readPage: (lastId: Long?, limit: Int) -> BatchPage<T>`
     *   函数类型语法：`(参数类型...) -> 返回类型`
     * - `transformAndWrite: (DSLContext, List<T>) -> Int`
     *   第一个参数是 jOOQ 的 DSLContext，在事务回调中提供
     *
     * ## implementationVersion 参数
     * 当任务的转换逻辑发生变化时（如字段映射规则改变），递增此版本号。
     * 旧版本的 checkpoint 会被视为失效，从头重新迁移。
     * 这是一种轻量级的"模式演进"机制，避免旧断点指向错误的逻辑位置。
     *
     * @param context 迁移上下文，提供数据库连接、配置、进度报告等
     * @param checkpointKey checkpoint 键（taskId + stream），唯一标识一个断点流
     * @param implementationVersion 任务实现版本，变更时使旧 checkpoint 失效
     * @param readPage 从源库读取一页数据的函数。参数：(上一页最大ID, 批大小)，返回：BatchPage
     * @param transformAndWrite 在目标库事务中转换并写入的函数。参数：(事务DSL上下文, 记录列表)，返回：实际写入数
     * @return BatchResult 包含最终游标、处理总数、跳过数、错误数
     */
    fun <T> processBatches(
        context: MigrationContext,
        checkpointKey: CheckpointKey,
        implementationVersion: Int = 1,
        readPage: (lastId: Long?, limit: Int) -> BatchPage<T>,
        transformAndWrite: (DSLContext, List<T>) -> Int,
    ): BatchResult {
        // 从 checkpoint 加载上次的断点位置，首次运行为 null（从头开始）
        var lastId: Long? = loadCursor(context, checkpointKey)
        var totalProcessed = 0L
        var totalSkipped = 0L
        var totalErrors = 0L

        while (true) {
            // 1. 从源库读取一页（不持有源库事务，避免长时间锁表）
            val page = readPage(lastId, context.options.batchSize)
            if (page.records.isEmpty()) break

            // 2. 在目标库事务中写入 + 保存 checkpoint
            //    关键：业务写入和 checkpoint 保存必须原子性，
            //    否则可能出现"数据写了但 checkpoint 没更新"导致重启后重复写入
            try {
                context.target.transaction { dsl ->
                    // 调用者实现的转换+写入逻辑
                    val written = transformAndWrite(dsl, page.records)
                    // written 可能小于 records.size，表示有些记录被跳过（如重复数据）
                    totalSkipped += page.records.size - written

                    // 保存 checkpoint（与业务写入共享事务，保证原子性）
                    val newCursor = page.nextCursor?.toString()
                    context.checkpoints.save(
                        dsl,
                        MigrationCheckpoint(
                            key = checkpointKey,
                            cursor = newCursor,
                            // processedCount 包含所有已处理的记录（含跳过的），
                            // 用于进度报告和断点恢复时的总数参考
                            processedCount = totalProcessed + page.records.size,
                            runId = context.runId,
                            implementationVersion = implementationVersion,
                            updatedAt = Instant.now(context.clock),
                        ),
                    )
                }
                // 事务成功提交后，更新本地状态
                totalProcessed += page.records.size
                lastId = page.nextCursor

                // 向进度报告器通知本批完成
                context.progress.batchCompleted(
                    checkpointKey.taskId,
                    totalProcessed,
                    java.time.Duration.ofMillis(0), // 由调用者计算，这里传 0
                )
            } catch (e: Exception) {
                // 事务已回滚（包括 checkpoint 保存），lastId 不变
                // 下次重试将从同一断点重新开始
                totalErrors += page.records.size
                context.errors.record(
                    org.abacusflow.migration.error.MigrationError(
                        runId = context.runId,
                        taskId = checkpointKey.taskId,
                        stream = checkpointKey.stream,
                        // recordKey 标识出错的批次位置，便于排查
                        recordKey = "batch-after-$lastId",
                        // 截断错误信息到 2000 字符，防止超长异常信息撑爆数据库字段
                        message = e.message?.take(2000) ?: "Unknown error",
                        retryable = true, // 批处理错误通常是临时的，可重试
                        createdAt = Instant.now(context.clock),
                    ),
                )
                // failFast 模式：立即抛出异常，中断整个迁移运行
                // 非 failFast 模式：记录错误，继续处理下一批
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

    /**
     * 从 checkpoint 表加载游标位置。
     *
     * ## 为什么在目标库读取 checkpoint
     * checkpoint 数据存储在目标库的 abacusflow_migration schema 中，
     * 因为 checkpoint 记录的是"目标库写到了哪里"，与目标库数据一致性绑定。
     *
     * ## Kotlin 语法要点
     * - `var cursor: Long? = null` 声明可空变量，初始为 null
     * - `context.target.read { dsl -> ... }` 使用 Lambda 接收 DSLContext
     * - `checkpoint?.cursor?.toLongOrNull()` 安全调用链：
     *   - checkpoint 为 null → 整个表达式为 null
     *   - cursor 为 null → 整个表达式为 null
     *   - cursor 非空但无法转 Long → toLongOrNull() 返回 null
     *   这种链式安全调用是 Kotlin 空安全的核心特性
     *
     * @param context 迁移上下文
     * @param key checkpoint 键
     * @return 上次断点位置的 ID，首次运行返回 null
     */
    private fun loadCursor(
        context: MigrationContext,
        key: CheckpointKey,
    ): Long? {
        var cursor: Long? = null
        context.target.read { dsl ->
            val checkpoint = context.checkpoints.find(dsl, key)
            cursor = checkpoint?.cursor?.toLongOrNull()
        }
        return cursor
    }
}

/**
 * 一页读取结果 —— readPage lambda 的返回类型。
 *
 * ## 设计目的
 * 将"记录列表"和"下一页游标"封装在一起，避免调用者手动维护游标状态。
 *
 * ## data class 的特性
 * Kotlin 的 data class 自动生成：
 * - equals() / hashCode()：基于所有构造参数
 * - toString()：格式为 "BatchPage(records=[...], nextCursor=123)"
 * - copy()：浅拷贝并可选修改部分字段
 * - component1() / component2()：支持解构声明 `val (records, cursor) = page`
 *
 * ## 泛型 T
 * T 是源库记录的类型，由 readPage 的实现决定。
 * 不同任务的 T 不同，但 BatchProcessor 对 T 透明——它只负责流转记录。
 *
 * @param T 源库记录的类型
 * @property records 本页读取到的记录列表
 * @property nextCursor 下一页的游标（本页最后一条记录的 ID），
 *           为 null 表示已读完所有数据
 */
data class BatchPage<T>(
    val records: List<T>,
    val nextCursor: Long?,
)

/**
 * 批处理汇总结果 —— processBatches 的返回类型。
 *
 * ## 设计目的
 * 汇总整个批处理循环的统计信息，供上层 [MigrationTask] 构建 [TaskResult]。
 *
 * ## 为什么 skippedCount 和 errorCount 有默认值 0
 * Kotlin 支持默认参数值，调用者可以只关心核心字段：
 * - `BatchResult(lastCursor = 100, processedCount = 5000)` — 无跳过无错误
 * - `BatchResult(lastCursor = 100, processedCount = 4800, skippedCount = 200)` — 有跳过
 * 这减少了样板代码，同时保持灵活性。
 *
 * @property lastCursor 最终游标位置（用于断点恢复），null 表示从头到尾无数据
 * @property processedCount 总处理记录数（含跳过的）
 * @property skippedCount 跳过的记录数（如重复数据、已存在记录）
 * @property errorCount 出错的记录数
 */
data class BatchResult(
    val lastCursor: Long?,
    val processedCount: Long,
    val skippedCount: Long = 0,
    val errorCount: Long = 0,
)
