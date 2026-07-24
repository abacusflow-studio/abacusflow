package org.abacusflow.migration.framework

import io.github.oshai.kotlinlogging.KotlinLogging
import java.time.Duration
import java.time.Instant
import java.util.UUID

/**
 * 顶层日志记录器。
 *
 * ## KotlinLogging 库
 * io.github.oshai.kotlinlogging 是 Kotlin 专用的日志门面库（SLF4J 的 Kotlin 封装），
 * 核心优势是**惰性求值**：`logger.info { ... }` 中的 lambda 只在日志级别启用时才执行，
 * 避免了 Java 中 `logger.info("..." + expensiveCall())` 的字符串拼接开销。
 *
 * ## 顶层声明（Top-level Declaration）
 * `private val logger` 声明在类外部，是 Kotlin 的顶层属性。
 * 编译后实际生成一个名为 `MigrationRunnerKt` 的类，logger 作为其 static 字段。
 * 这是 Kotlin 中日志记录器的惯用写法，比在每个类内部声明更简洁。
 */
private val logger = KotlinLogging.logger {}

/**
 * 迁移运行器 —— 整个迁移框架的顶层编排器。
 *
 * ## 设计目的
 * MigrationRunner 是迁移流程的"指挥官"，负责：
 * 1. 按固定顺序依次执行任务
 * 2. 处理失败策略（fail-fast vs 继续运行）
 * 3. 记录运行状态（开始、完成、失败）
 * 4. 汇总报告
 *
 * ## 职责边界（单一职责原则）
 * MigrationRunner **只做编排**，不做具体的数据处理：
 * - 批处理逻辑 → [BatchProcessor]
 * - SQL 读写 → [MigrationContext] 中的 source/target 数据库
 * - 字段转换 → 各 [MigrationTask] 实现
 * - 断点管理 → [MigrationContext] 中的 checkpoints 仓库
 *
 * 这种分离让每个组件都可以独立测试和替换。
 *
 * ## 与系统的连接
 * - 接收 [MigrationPlan]（构造时注入），从中获取任务列表
 * - 接收 [MigrationSelection]（运行时传入），决定执行哪些任务
 * - 通过 [MigrationContext] 访问所有基础设施（数据库、仓库、配置）
 * - 输出 [MigrationReport]，包含本次运行的完整统计
 * - 被 [MigrationCommand] 或 [DefaultMigrationApplication] 调用
 *
 * ## 为什么通过构造函数注入 plan 而非在 run() 中传入
 * - plan 在整个运行器生命周期中不变，属于"不变依赖"
 * - 构造注入让依赖关系显式化，便于测试时替换
 * - run() 方法只接收每次运行可能变化的参数（context, selection）
 */
class MigrationRunner(
    /** 迁移计划，包含所有已注册的任务及其固定顺序。 */
    private val plan: MigrationPlan,
) {
    /**
     * 执行一次迁移运行。
     *
     * ## 执行流程
     * ```
     * 1. 记录运行开始时间
     * 2. 根据 selection 解析出要执行的任务列表
     * 3. 在 run 表中记录本次运行状态为 RUNNING
     * 4. 逐个执行任务：
     *    a. 如果前序任务失败且 failFast=true，跳过剩余任务
     *    b. 记录任务开始
     *    c. 执行任务（调用 task.execute）
     *    d. 记录任务完成/失败
     * 5. 在 run 表中记录最终状态（SUCCEEDED / FAILED）
     * 6. 返回 MigrationReport
     * ```
     *
     * ## 失败策略
     * - **failFast=true**（默认）：任何任务失败后立即停止，跳过剩余任务
     * - **failFast=false**：任务失败后记录错误，继续执行后续任务
     *   适用于"尽量多迁移"的场景，但可能导致下游任务因缺少上游数据而失败
     *
     * ## UnsupportedOperationException 的特殊处理
     * 骨架任务（继承 [PlannedMigrationTask]）在未实现时抛出此异常。
     * Runner 对此做特殊捕获和日志，区分"未实现"和"运行时错误"，
     * 方便开发者识别哪些任务还是占位符。
     *
     * ## Kotlin 语法要点
     * - `for (task in resolvedTasks)` Kotlin 的 for 循环等价于 Java 的增强 for
     * - `logger.info { ... }` 惰性求值的日志 lambda
     * - `logger.error(e) { ... }` 带异常堆栈的日志
     * - `if (failed) ... else ...` Kotlin 的 if 是表达式，但这里作为语句使用
     *
     * @param context 本次运行的上下文，包含所有基础设施依赖
     * @param selection 任务选择模型，决定执行哪些任务
     * @return MigrationReport 本次运行的完整报告
     */
    fun run(
        context: MigrationContext,
        selection: MigrationSelection,
    ): MigrationReport {
        val startedAt = Instant.now(context.clock)
        // 通过 plan.resolve 将选择模型解析为有序任务列表
        // resolve 会自动补齐依赖闭包，保证执行顺序满足依赖约束
        val resolvedTasks = plan.resolve(selection)

        logger.info { "Migration run ${context.runId}: ${resolvedTasks.size} tasks selected" }

        // 在 run 表中记录本次运行开始
        // runId 是 UUID，全局唯一，用于关联所有 checkpoint、error 记录
        context.runs.start(
            org.abacusflow.migration.run.MigrationRun(
                runId = context.runId,
                status = org.abacusflow.migration.run.MigrationRunStatus.RUNNING,
                selectedTasks = resolvedTasks.map { it.id }.toSet(),
                startedAt = startedAt,
                finishedAt = null, // 运行中，结束时间为空
            ),
        )

        val taskResults = mutableListOf<TaskResult>()
        var failed = false

        for (task in resolvedTasks) {
            // failFast 模式下，前序任务失败后跳过所有后续任务
            if (failed && context.options.failFast) {
                logger.warn { "Skipping task ${task.id.cliName} due to previous failure (fail-fast)" }
                break
            }

            val taskStartedAt = Instant.now(context.clock)
            // 通知 run 仓库和进度报告器任务开始
            context.runs.taskStarted(context.runId, task.id)
            context.progress.taskStarted(task.id, null)

            try {
                // 执行任务的核心逻辑（由各 MigrationTask 实现类提供）
                val result = task.execute(context)
                // 记录任务完成状态
                context.runs.taskCompleted(context.runId, result)
                context.progress.taskCompleted(result)
                taskResults.add(result)

                logger.info {
                    "Task ${task.id.cliName} completed: processed=${result.processedCount}, " +
                        "skipped=${result.skippedCount}, errors=${result.errorCount}"
                }
            } catch (e: UnsupportedOperationException) {
                // 骨架任务未实现：PlannedMigrationTask 的默认 execute 抛出此异常
                // 这不是运行时错误，而是开发阶段的占位标记
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
                // 运行时错误：数据库异常、数据格式错误等
                val failedResult =
                    TaskResult(
                        taskId = task.id,
                        processedCount = 0,
                        errorCount = 1,
                    )
                taskResults.add(failedResult)
                failed = true
                // logger.error(e) 会打印完整异常堆栈，便于排查
                logger.error(e) { "Task ${task.id.cliName} failed" }

                if (context.options.failFast) break
            }
        }

        val finishedAt = Instant.now(context.clock)
        // 根据是否有任务失败决定最终状态
        val finalStatus =
            if (failed) {
                org.abacusflow.migration.run.MigrationRunStatus.FAILED
            } else {
                org.abacusflow.migration.run.MigrationRunStatus.SUCCEEDED
            }
        // 在 run 表中记录运行结束
        context.runs.finish(context.runId, finalStatus, finishedAt, null)

        return MigrationReport(
            runId = context.runId,
            startedAt = startedAt,
            duration = Duration.between(startedAt, finishedAt),
            taskResults = taskResults,
        )
    }
}

/**
 * 迁移运行报告 —— 一次完整迁移运行的汇总结果。
 *
 * ## 设计目的
 * 作为 [MigrationRunner.run] 的返回值，提供本次运行的完整统计信息，
 * 用于日志输出、CLI 展示、或写入报告文件。
 *
 * ## data class 的选择
 * 纯数据容器，无行为只有数据持有，用 data class 最合适。
 * 自动生成的 toString() 方便日志输出，copy() 方便构建变体。
 *
 * ## 为什么 duration 是 Duration 而非 Long（毫秒数）
 * - Duration 是 java.time 包中的类型，语义明确，支持各种时间单位转换
 * - 比裸 Long 更类型安全，不会混淆毫秒和秒
 * - 可以方便地格式化为人类可读的字符串（如 "2m 30s"）
 *
 * @property runId 本次运行的唯一标识，与 run 表、checkpoint 表、error 表关联
 * @property startedAt 运行开始时间
 * @property duration 运行总耗时
 * @property taskResults 各任务的执行结果列表，顺序与执行顺序一致
 */
data class MigrationReport(
    val runId: UUID,
    val startedAt: Instant,
    val duration: Duration,
    val taskResults: List<TaskResult>,
)
