package org.abacusflow.migration.report

import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import java.time.Duration

/**
 * ## 进度报告端口（接口）
 *
 * ### 设计目的与迁移管线中的角色
 * 本接口是迁移管线中的"进度报告"抽象层，采用六边形架构/端口-适配器模式：
 * - **端口（Port）**：即本接口，定义「应用需要什么能力」的接口（如"报告进度"）
 * - **适配器（Adapter）**：即 ConsoleProgressReporter 等实现类，负责具体的输出方式
 *
 * 这种设计将"进度事件的发生"与"进度事件的展示"彻底解耦：
 * - 迁移任务（MigrationRunner、BatchProcessor）只依赖端口接口，
 *   不知道也不关心进度最终输出到终端、日志文件还是 JSON
 * - 可以轻松替换输出方式（如从控制台切换到 Web UI、日志文件、消息队列等）
 * - 支持多种输出方式并行（如同时输出到控制台和日志）
 *
 * ### 三个事件的生命周期
 * ```
 * taskStarted  ──→  batchCompleted × N  ──→  taskCompleted
 *     ↑                  ↑                        ↑
 *  任务开始时调用     每批写入后调用            任务结束时调用
 *  (1次)              (N次, N=总批次数)        (1次)
 * ```
 *
 * ### 与其他组件的连接
 * - MigrationContext 持有 ProgressReporter 实例，传递给所有迁移任务
 * - 迁移任务在处理数据时调用 taskStarted/batchCompleted/taskCompleted
 * - DefaultMigrationApplication 创建 ConsoleProgressReporter 并注入 MigrationContext
 * - 未来可扩展：WebProgressReporter（推送到前端）、LoggingProgressReporter（写入日志文件）
 *
 * ### Kotlin 语法要点
 * - `interface`：Kotlin 接口，与 Java 8+ 接口类似，可包含抽象方法和默认方法
 * - `Long?`：estimatedTotal 可空。如果无法预估总量则传 null
 * - `Duration`：java.time.Duration，Java 8+ 标准库中的时间长度类型，
 *   精确到纳秒，适合度量任务执行耗时
 */
interface ProgressReporter {
    /**
     * 报告任务开始事件。
     *
     * 在迁移任务开始执行时调用，通常在读取源数据之前。
     * 如果任务能预估总记录数（如通过 COUNT 查询），则传入 estimatedTotal，
     * 否则传入 null 表示未知。
     *
     * @param taskId 迁移任务标识符，包含 cliName 等显示信息
     * @param estimatedTotal 预估的总记录数，null 表示未知
     */
    fun taskStarted(
        taskId: MigrationTaskId,
        estimatedTotal: Long?,
    )

    /**
     * 报告批次完成事件。
     *
     * 在每处理完一批记录后调用（高频事件，可能每秒调用多次）。
     * 实现类应自行控制输出频率，避免控制台刷屏或日志膨胀。
     *
     * @param taskId 迁移任务标识符
     * @param processedCount 截至当前已处理的记录总数（累计值，非增量值）
     * @param elapsed 从任务开始到当前的耗时
     */
    fun batchCompleted(
        taskId: MigrationTaskId,
        processedCount: Long,
        elapsed: Duration,
    )

    /**
     * 报告任务完成事件。
     *
     * 在迁移任务执行完毕后调用，无论是成功、部分失败还是全部失败。
     * TaskResult 包含最终的统计信息，是迁移报告的核心数据来源。
     *
     * @param result 任务执行结果，包含处理数、跳过数、错误数等统计
     */
    fun taskCompleted(result: TaskResult)
}

/**
 * ## 控制台进度报告器（适配器）
 *
 * 输出到 System.out，格式示例：
 * ```
 * [user] Starting/5000...
 * [user] Processed: 3000 (1000 rec/s)    ← \r 覆盖同一行
 * [user] Done. Processed: 5000, Skipped: 3, Errors: 0
 * ```
 *
 * ### 设计目的
 * 本类是 ProgressReporter 的控制台实现，为命令行环境提供实时进度反馈。
 * 核心设计考量：
 * 1. 频率控制：最多每秒输出一次，避免大量数据迁移时控制台刷屏
 * 2. 行内更新：使用 \r（回车符）实现行内刷新，避免进度信息占满整个终端
 * 3. 速度计算：显示 rec/s（每秒记录数），帮助运维人员估算剩余时间
 * 4. 最终汇总：任务完成时输出完整的统计信息（处理数、跳过数、错误数）
 *
 * ### 节流设计
 * batchCompleted 每批调用一次（可能每秒数百次），但终端刷新频率有限。
 * 因此设置 printIntervalMs=1000，最多每秒输出一次，避免刷屏。
 *
 * ### 与其他组件的连接
 * - 由 DefaultMigrationApplication 创建并注入到 MigrationContext
 * - 被所有迁移任务通过 MigrationContext.progress 调用
 * - 可被其他 ProgressReporter 实现替换（如 Web 端、日志文件）
 *
 * ### Kotlin 语法要点
 * - `private var lastPrintTime: Long = 0`
 *   → var 声明可变变量（与 val 只读相对）。这里需要记录上次打印时间，所以用 var。
 *
 * - `estimatedTotal?.let { "/$it" } ?: ""`
 *   → ?.let {} ：如果 estimatedTotal 非 null，执行 let 块；如果 null，跳过
 *   → ?: "" ：Elvis 运算符，如果左侧为 null 则使用右侧默认值
 *   → $it ：字符串模板，it 是 let 块的隐式参数（即 estimatedTotal 的值）
 *   → 整体含义：如果有预估值则显示 "/5000"，否则显示空字符串
 *
 * - `print("\r...")`
 *   → \r 是回车符（carriage return），让光标回到行首但不换行
 *   → 效果是覆盖当前行内容，实现"进度条"效果
 *   → 对比 println() 会在末尾加换行，每次输出占新行
 *
 * - `if (now - lastPrintTime < printIntervalMs) return`
 *   → 节流：距离上次打印不足 1 秒，直接 return 跳过本次输出
 *
 * - `elapsed.seconds`：Duration 的属性，返回耗时总秒数（截断小数部分）
 */
class ConsoleProgressReporter : ProgressReporter {
    /** 上次输出进度的时间戳（毫秒），用于频率控制。 */
    private var lastPrintTime: Long = 0

    /** 输出间隔（毫秒），最多每秒输出一次进度，避免控制台刷屏。 */
    private val printIntervalMs: Long = 1000 // 最多每秒输出一次

    /**
     * 报告任务开始。
     *
     * 输出格式：[taskName] Starting[/estimatedTotal]...
     * 如果预估总量已知，显示 "/总量"（如 Starting/5000...），
     * 否则只显示 "Starting..."。
     *
     * 使用 println() 输出完整行（带换行），因为这是任务的起始标记。
     */
    override fun taskStarted(
        taskId: MigrationTaskId,
        estimatedTotal: Long?,
    ) {
        // ?.let 安全调用：estimatedTotal 不为 null 时格式化为 "/数字"，null 时为空字符串
        val totalStr = estimatedTotal?.let { "/$it" } ?: ""
        println("[${taskId.cliName}] Starting$totalStr...")
    }

    /**
     * 报告批次完成进度。
     *
     * 【频率控制逻辑】
     * 检查当前时间与上次输出时间的差值，如果不足 printIntervalMs（1秒），
     * 则跳过本次输出。这确保了即使 batchCompleted 被高频调用（如每处理 100 条调用一次），
     * 控制台输出也不会超过每秒一次。
     *
     * 【行内刷新】
     * 使用 print("\r...") 而非 println()，\r 将光标移到行首，
     * 新内容覆盖旧行内容，实现进度条的"原地刷新"效果。
     * 末尾的空格用于覆盖前次输出可能多出的字符。
     *
     * 【速度计算】
     * rate = processedCount / elapsed.seconds
     * 使用累计值计算平均速度（而非瞬时速度），更稳定、更有参考价值。
     * 当 elapsed < 1秒时，直接使用 processedCount 作为 rate（避免除零）。
     */
    override fun batchCompleted(
        taskId: MigrationTaskId,
        processedCount: Long,
        elapsed: Duration,
    ) {
        // 频率控制：距离上次输出不足 1 秒则跳过
        val now = System.currentTimeMillis()
        if (now - lastPrintTime < printIntervalMs) return
        lastPrintTime = now

        // 计算平均处理速度（记录数/秒）
        val seconds = elapsed.seconds
        val rate = if (seconds > 0) processedCount / seconds else processedCount

        // \r 回车符实现行内刷新，末尾空格覆盖前次多出的字符
        print("\r[${taskId.cliName}] Processed: $processedCount ($rate rec/s)    ")
    }

    /**
     * 报告任务完成。
     *
     * 【输出格式】
     * 先输出一个换行（结束 batchCompleted 的行内刷新），
     * 然后输出完整的统计信息：
     * [taskName] Done. Processed: N, Skipped: M, Errors: K
     *
     * 【统计指标含义】
     * - Processed：成功处理的记录数
     * - Skipped：跳过的记录数（如已迁移的重复记录、不符合条件的记录）
     * - Errors：处理失败的记录数（如数据格式错误、外键约束违反）
     */
    override fun taskCompleted(result: TaskResult) {
        // 换行，结束 batchCompleted 的 \r 覆盖模式
        println()
        // 输出任务完成的汇总统计
        println(
            "[${result.taskId.cliName}] Done. " +
                "Processed: ${result.processedCount}, " +
                "Skipped: ${result.skippedCount}, " +
                "Errors: ${result.errorCount}",
        )
    }
}
