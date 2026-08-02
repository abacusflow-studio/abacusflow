package org.abacusflow.migration.bootstrap

import io.github.oshai.kotlinlogging.KotlinLogging
import org.abacusflow.migration.check.SchemaChecker
import org.abacusflow.migration.checkpoint.JooqMigrationCheckpointRepository
import org.abacusflow.migration.config.MigrationOptions
import org.abacusflow.migration.control.ControlSchemaInitializer
import org.abacusflow.migration.database.SourceDatabase
import org.abacusflow.migration.database.TargetDatabase
import org.abacusflow.migration.error.JooqMigrationErrorRepository
import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationReport
import org.abacusflow.migration.framework.MigrationRunner
import org.abacusflow.migration.framework.MigrationSelection
import org.abacusflow.migration.migration.StandardMigrationPlan
import org.abacusflow.migration.report.ConsoleProgressReporter
import org.abacusflow.migration.run.JooqMigrationRunRepository
import org.abacusflow.migration.validation.StandardValidationPlan
import org.abacusflow.migration.validation.ValidationReport
import java.time.Clock
import java.time.Instant
import java.util.UUID

// KotlinLogging：Kotlin 习惯的日志声明方式，通过 {} 延迟求值避免不必要的字符串拼接
private val logger = KotlinLogging.logger {}

/**
 * MigrationApplication 的默认实现：编排 migrate 和 validate 命令。
 *
 * 【设计目的与迁移管线中的角色】
 * 本类是迁移工具的"应用层入口"——它是整个迁移管线的最顶层编排器，
 * 负责组装所有组件并启动迁移或验证流程。它对应 CLI 命令的 "migrate" 和 "validate" 子命令，
 * 是用户交互层与迁移框架之间的桥梁。
 *
 * 【编排职责】
 * 本类不包含具体的迁移逻辑，而是负责"组装"和"启动"：
 * 1. 创建所有基础设施组件（检查点仓库、错误仓库、运行仓库、进度报告器）
 * 2. 构建 MigrationContext（迁移执行的上下文对象）
 * 3. 创建 MigrationPlan（通过 StandardMigrationPlan）或 ValidationPlan
 * 4. 启动 MigrationRunner 执行迁移，或逐个执行验证器
 *
 * 【组件组装关系图】
 * ```
 * DefaultMigrationApplication
 *   ├── source: SourceDatabase          ← V1 数据库连接
 *   ├── target: TargetDatabase          ← V2 数据库连接
 *   │
 *   ├── migrate() 方法组装：
 *   │   ├── JooqMigrationCheckpointRepository  ← 检查点持久化（基于 jOOQ）
 *   │   ├── JooqMigrationErrorRepository       ← 错误记录持久化（基于 jOOQ）
 *   │   ├── JooqMigrationRunRepository         ← 运行记录持久化（基于 jOOQ）
 *   │   ├── ConsoleProgressReporter            ← 控制台进度输出
 *   │   ├── StandardMigrationPlan.create()     ← 迁移任务列表
 *   │   ├── MigrationRunner                    ← 任务执行引擎
 *   │   └── MigrationContext                   ← 执行上下文
 *   │
 *   └── validate() 方法组装：
 *       ├── （同上的仓库和报告器）
 *       ├── StandardValidationPlan.create()    ← 验证器列表
 *       └── 逐个执行验证器，捕获 UnsupportedOperationException
 * ```
 *
 * 【与其他组件的连接】
 * - 实现 MigrationApplication 接口，被 CLI 层（如 picocli 命令）调用
 * - 依赖 SourceDatabase / TargetDatabase（数据库访问层）
 * - 依赖 StandardMigrationPlan / StandardValidationPlan（计划和验证蓝图）
 * - 依赖 MigrationRunner（任务执行引擎）
 * - 依赖 MigrationContext（执行上下文，传递给所有任务和验证器）
 * - 依赖 ConsoleProgressReporter（进度报告）
 * - 依赖 JooqMigrationCheckpointRepository / JooqMigrationErrorRepository / JooqMigrationRunRepository
 *   （jOOQ 实现的持久化仓库，将迁移状态写入 abacusflow_migration schema）
 * - 实现 Closeable（通过 close() 方法），确保数据库连接被正确释放
 *
 * 【Kotlin 语法要点】
 * - class ... : MigrationApplication：类实现接口，Kotlin 使用冒号表示实现/继承
 * - override fun：覆盖接口方法，Kotlin 要求显式标注 override（防止意外覆盖）
 * - UUID.randomUUID()：Java 标准库方法，生成全局唯一 ID
 * - Clock.systemUTC()：Java 8 时间 API，获取 UTC 时区的时钟，
 *   便于测试时注入自定义时钟
 * - runCatching { ... }.onFailure { ... }：Kotlin 的安全异常处理惯用法，
 *   等价于 try-catch 但更函数式，runCatching 返回 Result<T>
 * - it：lambda 的隐式单参数，如 onFailure { logger.warn(it) { ... } } 中的 it 是异常对象
 */
class DefaultMigrationApplication(
    /** 源数据库（V1），迁移时读取数据。 */
    private val source: SourceDatabase,
    /** 目标数据库（V2），迁移时写入数据。 */
    private val target: TargetDatabase,
    /** 从 YAML 加载的迁移选项；所有运行期组件必须共享这一份配置。 */
    private val options: MigrationOptions,
) : MigrationApplication {
    override fun plan(selection: MigrationSelection): MigrationPlanReport {
        val schemaCheck = SchemaChecker(source, target, options.controlSchema).check()
        val tasks = StandardMigrationPlan.create().resolve(selection).map { it.id }
        return MigrationPlanReport(schemaCheck, tasks)
    }

    private val controlSchemaInitializer = ControlSchemaInitializer(target, options.controlSchema)

    /**
     * 执行数据迁移。
     *
     * 【执行流程】
     * 1. 生成唯一的 runId（标识本次迁移运行）
     * 2. 创建所有基础设施组件（仓库、报告器、计划、运行器）
     * 3. 组装 MigrationContext（包含所有依赖）
     * 4. 调用 MigrationRunner.run() 执行迁移
     * 5. 记录迁移结果（成功/失败/耗时）
     *
     * 【MigrationSelection 参数】
     * selection 参数允许选择性地执行部分任务（而非全量迁移），
     * 支持场景如：
     * - 只迁移用户和角色（跳过业务数据）
     * - 重试失败的任务
     * - 增量迁移
     *
     * 【MigrationContext 的组成】
     * - runId：运行唯一标识
     * - source/target：数据库连接
     * - checkpoints：检查点仓库（支持断点续迁）
     * - errors：错误仓库（记录失败记录详情）
     * - runs：运行仓库（记录迁移运行历史）
     * - options：迁移配置选项（如批量大小、是否跳过已迁移记录等）
     * - progress：进度报告器（输出进度事件）
     * - clock：时钟（用于记录时间戳，便于测试时注入）
     *
     * 【Kotlin 语法要点】
     * - val 声明不可变局部变量，所有组件引用在创建后不可更改
     * - MigrationContext(...)：调用数据类构造函数，使用命名参数风格
     * - if (report.taskResults.all { it.errorCount == 0L })：Kotlin 集合的 all() 方法，
     *   判断所有任务的错误数是否为 0
     * - 字符串模板 ${}：在字符串中嵌入表达式
     *
     * @param selection 迁移选择策略（全量/选择性）
     * @return MigrationReport 包含所有任务的执行结果
     */
    override fun migrate(selection: MigrationSelection): MigrationReport {
        // 必须早于 migration_run 的第一次写入；重复运行只会确认对象已经存在。
        controlSchemaInitializer.initialize()
        // 生成本次迁移运行的唯一 ID，贯穿整个迁移流程
        val runId = UUID.randomUUID()
        val controlSchema = options.controlSchema
        val schemaChecker = SchemaChecker(source, target, controlSchema)
        val schemaCheck = schemaChecker.check()
        require(schemaCheck.passed) {
            "Migration schema check failed:\n${schemaCheck.errors.joinToString("\n")}"
        }
        check(schemaChecker.acquireLock(runId)) {
            "Another migration process currently holds the migration lock"
        }

        // ===== 组装基础设施组件 =====
        // 检查点仓库：基于 jOOQ 实现，将检查点写入 abacusflow_migration schema
        // 支持断点续迁——记录每个任务已处理到的位置
        val checkpoints = JooqMigrationCheckpointRepository(controlSchema)
        // 错误仓库：记录迁移过程中失败的记录详情（源 ID、错误原因等）
        val errors = JooqMigrationErrorRepository(target, controlSchema)
        // 运行仓库：记录每次迁移运行的元数据（开始时间、结束时间、状态等）
        val runs = JooqMigrationRunRepository(target, controlSchema)
        // 进度报告器：输出到控制台，每秒刷新一次进度
        val progress = ConsoleProgressReporter()
        // 迁移计划：包含所有迁移任务及其依赖关系
        val plan = StandardMigrationPlan.create()
        // 迁移运行器：解析依赖图，按拓扑顺序执行任务
        val runner = MigrationRunner(plan)

        // ===== 构建 MigrationContext =====
        // MigrationContext 是迁移执行的"上下文对象"，传递给所有任务
        // 包含了任务执行所需的全部依赖
        val context =
            MigrationContext(
                runId = runId,
                source = source,
                target = target,
                checkpoints = checkpoints,
                errors = errors,
                runs = runs,
                options = options,
                progress = progress,
                clock = Clock.systemUTC(), // UTC 时钟，便于测试时注入
            )

        // ===== 执行迁移 =====
        logger.info { "Starting migration run $runId" }
        val report =
            try {
                runner.run(context, selection)
            } finally {
                schemaChecker.releaseLock()
            }
        // 记录迁移结果：所有任务零错误则为成功，否则为有错误
        logger.info {
            "Migration run $runId ${if (report.taskResults.all { it.errorCount == 0L }) "succeeded" else "had errors"} " +
                "in ${report.duration}"
        }
        return report
    }

    /**
     * 执行迁移结果验证。
     *
     * 【设计目的】
     * 迁移完成后，需要验证 V2 数据的正确性和完整性。
     * 验证器检查如：
     * - 记录数是否匹配（V1 和 V2 的对应表行数）
     * - 外键关联是否完整（V2 中所有引用 ID 都能找到对应记录）
     * - 必填字段是否非空
     * - 枚举值是否合法
     *
     * 【验证流程】
     * 1. 生成唯一的 runId
     * 2. 创建基础设施组件（与 migrate 相同）
     * 3. 构建 MigrationContext
     * 4. 从 StandardValidationPlan 获取所有验证器
     * 5. 逐个执行验证器，捕获 UnsupportedOperationException
     *    （未实现的验证器标记为 not_implemented，而非让整个验证流程崩溃）
     * 6. 汇总验证结果
     *
     * 【为什么验证器可以捕获 UnsupportedOperationException】
     * 与 PlannedMigrationTask 类似，验证器也有"骨架阶段"——
     * 先定义验证器的结构和接口，但暂不实现具体验证逻辑。
     * 捕获 UnsupportedOperationException 确保：
     * - 未实现的验证器不会中断整个验证流程
     * - 验证报告中明确标记哪些验证器尚未实现
     * - 已实现的验证器可以正常运行
     *
     * 【Kotlin 语法要点】
     * - validators.map { validator -> ... }：对验证器列表进行映射转换，
     *   每个验证器执行后产生一个 ValidationResult
     * - try { ... } catch (e: UnsupportedOperationException) { ... }：
     *   捕获骨架阶段未实现的验证器抛出的异常
     * - Duration.between(start, Instant.now())：计算验证耗时
     * - ValidationReport(results)：汇总所有验证结果
     *
     * @param selection 验证选择策略（全量/选择性）
     * @return ValidationReport 包含所有验证器的验证结果
     */
    override fun validate(selection: MigrationSelection): ValidationReport {
        // validate 也会读取控制表，因此支持在全新目标库上独立执行。
        controlSchemaInitializer.initialize()
        // 生成本次验证运行的唯一 ID
        val runId = UUID.randomUUID()
        val controlSchema = options.controlSchema
        val schemaCheck = SchemaChecker(source, target, controlSchema).check()
        require(schemaCheck.passed) {
            "Validation schema check failed:\n${schemaCheck.errors.joinToString("\n")}"
        }

        // ===== 组装基础设施组件（与 migrate 相同） =====
        val checkpoints = JooqMigrationCheckpointRepository(controlSchema)
        val errors = JooqMigrationErrorRepository(target, controlSchema)
        val runs = JooqMigrationRunRepository(target, controlSchema)
        val progress = ConsoleProgressReporter()

        // ===== 构建 MigrationContext =====
        val context =
            MigrationContext(
                runId = runId,
                source = source,
                target = target,
                checkpoints = checkpoints,
                errors = errors,
                runs = runs,
                options = options,
                progress = progress,
                clock = Clock.systemUTC(),
            )

        // ===== 执行验证器 =====
        // 从 StandardValidationPlan 获取所有验证器实例
        val selectedTaskIds =
            when (selection) {
                MigrationSelection.All -> org.abacusflow.migration.framework.MigrationTaskId.entries.toSet()
                is MigrationSelection.Selected -> MigrationSelection.resolveClosure(selection.taskIds)
            }
        val validators = StandardValidationPlan.create().filter { it.taskId in selectedTaskIds }
        // 逐个执行验证器，捕获未实现的验证器异常
        val results =
            validators.map { validator ->
                val start = Instant.now()
                try {
                    // 执行验证逻辑，返回 ValidationResult
                    validator.validate(context)
                } catch (e: UnsupportedOperationException) {
                    // 验证器尚未实现（骨架阶段），标记为 not_implemented
                    // 而非让整个验证流程崩溃
                    org.abacusflow.migration.validation.ValidationResult(
                        taskId = validator.taskId,
                        passed = false, // 未实现的验证器视为未通过
                        metrics = mapOf("status" to "not_implemented"),
                        violations = listOf("Validator not implemented: ${e.message}"),
                        duration = java.time.Duration.between(start, Instant.now()),
                    )
                }
            }

        // 汇总所有验证结果
        return ValidationReport(results)
    }

    /**
     * 释放资源，关闭数据库连接。
     *
     * 【安全关闭设计】
     * 使用 runCatching 包装 close 操作，确保：
     * 1. 即使 source 关闭失败，target 仍然会被尝试关闭
     * 2. 关闭失败只记录警告日志，不抛出异常（避免影响上层清理逻辑）
     * 3. 数据库连接泄漏的风险最小化
     *
     * 【Kotlin 语法要点】
     * - runCatching { ... }：Kotlin 的安全异常处理，将异常包装为 Result<T>
     * - .onFailure { ... }：Result 的方法，仅在发生异常时执行
     * - logger.warn(it) { ... }：KotlinLogging 的警告日志，
     *   it 是异常对象（Throwable），第二个 lambda 是延迟求值的日志消息
     */
    override fun close() {
        runCatching { source.close() }.onFailure { logger.warn(it) { "Failed to close source database" } }
        runCatching { target.close() }.onFailure { logger.warn(it) { "Failed to close target database" } }
    }
}
