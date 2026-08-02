package org.abacusflow.migration.framework

/**
 * 迁移任务接口 —— 每个迁移任务的抽象契约。
 *
 * ## 设计目的
 * MigrationTask 定义了所有迁移任务必须满足的契约：
 * 1. 有唯一标识（id）
 * 2. 声明前置依赖（dependencies）
 * 3. 可执行（execute）
 *
 * 这是策略模式（Strategy Pattern）的典型应用：
 * - [MigrationRunner] 作为上下文，按顺序调用各任务的 execute
 * - 每个任务实现类是一个具体策略，封装了特定领域数据的迁移逻辑
 * - Runner 不关心任务内部如何迁移，只关心执行结果
 *
 * ## 为什么用 interface 而非 abstract class
 * - Kotlin 接口可以包含属性声明（id, dependencies），不限于方法
 * - 允许实现类自由选择继承体系：
 *   - [PlannedMigrationTask] 选择 abstract class，提供骨架占位行为
 *   - 具体任务（如 TenantMigration）继承 PlannedMigrationTask
 * - 如果用 abstract class，会占用唯一的继承位，限制灵活性
 * - interface 更符合"契约定义"的语义，abstract class 更适合"提供默认实现"
 *
 * ## 幂等性要求
 * 注释强调"实现者必须保证重复执行安全（幂等或冲突策略明确）"。
 * 这是因为迁移工具支持断点恢复——如果上次运行在某个任务中途失败，
 * 重启后该任务会从头重新执行（checkpoint 只记录到批次级别）。
 * 因此任务必须能安全地重复处理已迁移的数据，常见策略：
 * - **UPSERT**（INSERT ON CONFLICT UPDATE）：重复数据自动更新
 * - **先删后插**：每批开始前删除目标表中对应记录，再重新插入
 * - **跳过已存在**：检测到目标已有该记录则跳过
 *
 * ## 多 checkpoint stream
 * 注释提到"任务内部可有多个 checkpoint stream"。
 * 例如 ProductMigration 可能有两个流：
 * - "product-category"：迁移产品分类
 * - "product"：迁移产品
 * 两个流独立分页、独立断点，互不影响。
 * 通过 [CheckpointKey]（taskId + stream）区分不同的断点流。
 *
 * ## 与系统的连接
 * - [MigrationPlan.tasks] 持有所有 MigrationTask 实例
 * - [MigrationRunner.run] 依次调用各任务的 execute
 * - [PlannedMigrationTask] 提供骨架占位实现
 * - 各具体任务（TenantMigration、UserMigration 等）实现此接口
 * - [TaskResult] 是 execute 的返回类型
 */
interface MigrationTask {
    /**
     * 任务的唯一标识。
     *
     * 使用 [MigrationTaskId] 枚举，保证全局唯一且编译期安全。
     * 此标识用于：
     * - checkpoint 表的主键组成部分
     * - error 表的记录归属
     * - run 表的选中任务集合
     * - CLI 参数匹配
     * - 日志输出
     */
    val id: MigrationTaskId

    /**
     * 任务的前置依赖集合。
     *
     * 声明本任务执行前必须已完成哪些任务。
     * 例如 INVENTORY 依赖 PRODUCT 和 DEPOT，
     * 因为库存记录需要引用产品和仓库的外键。
     *
     * ## 与 MigrationSelection.DEPENDENCIES 的关系
     * 此处的 dependencies 是"任务实例声明的依赖"，
     * 而 MigrationSelection.DEPENDENCIES 是"CLI 选择模型中的依赖映射"。
     * 两者应该保持一致，但用途不同：
     * - 此处用于文档和运行时校验
     * - MigrationSelection.DEPENDENCIES 用于计算依赖闭包
     *
     * 当前框架没有在运行时校验依赖是否满足（依赖固定顺序保证），
     * 但此属性为未来的运行时校验预留了接口。
     */
    val dependencies: Set<MigrationTaskId>

    /** 返回可低成本获得的源记录总量；复合流任务默认返回 null，避免展示错误进度。 */
    fun estimateTotal(context: MigrationContext): Long? {
        if (id == MigrationTaskId.TENANT) return 1L
        val table = id.sourceTable ?: return null
        return context.source.read { dsl ->
            requireNotNull(
                dsl.fetchValue("SELECT COUNT(*) FROM ${dsl.render(org.jooq.impl.DSL.name(table))}") as Number?,
            ).toLong()
        }
    }

    /**
     * 执行迁移任务。
     *
     * ## 实现要求
     * - 必须幂等：重复执行不应产生错误或数据不一致
     * - 内部通常使用 [BatchProcessor] 进行分批处理
     * - 可以有多个 checkpoint stream（如 "product-category" 和 "product"）
     * - 返回 [TaskResult] 汇总本次执行的统计信息
     *
     * ## 异常处理
     * - 正常完成：返回 TaskResult
     * - 骨架未实现：抛出 UnsupportedOperationException（由 PlannedMigrationTask 默认实现）
     * - 运行时错误：抛出异常，由 [MigrationRunner] 捕获并记录
     *
     * @param context 迁移上下文，提供所有基础设施依赖
     * @return 任务执行结果，包含处理数、跳过数、错误数
     */
    fun execute(context: MigrationContext): TaskResult
}

/**
 * 任务执行结果 —— 单个迁移任务的执行统计。
 *
 * ## 设计目的
 * 作为 [MigrationTask.execute] 的返回类型，提供任务执行后的统计信息，
 * 供 [MigrationRunner] 汇总到 [MigrationReport] 中。
 *
 * ## data class 的选择
 * 纯数据容器，自动生成 equals/hashCode/copy/toString。
 * 特别有用的是 toString()，在日志中输出：
 * `TaskResult(taskId=PRODUCT, processedCount=5000, skippedCount=200, errorCount=0)`
 *
 * ## 为什么 skippedCount 和 errorCount 有默认值 0
 * Kotlin 默认参数值让调用更简洁：
 * - 大多数任务没有跳过和错误：`TaskResult(taskId = id, processedCount = count)`
 * - 有跳过时才需要指定：`TaskResult(taskId = id, processedCount = count, skippedCount = skip)`
 * 这减少了样板代码，同时保持灵活性。
 *
 * ## 与 BatchResult 的区别
 * - [BatchResult] 是 [BatchProcessor] 的返回类型，统计单个批处理循环
 * - TaskResult 是 [MigrationTask] 的返回类型，统计整个任务（可能包含多个批处理循环）
 * - TaskResult 通常由 BatchResult 的数据汇总而来
 *
 * @property taskId 任务标识，与 [MigrationTask.id] 对应
 * @property processedCount 总处理记录数（含跳过的）
 * @property skippedCount 跳过的记录数（如重复数据、已存在记录），默认 0
 * @property errorCount 出错的记录数，默认 0
 */
data class TaskResult(
    val taskId: MigrationTaskId,
    val processedCount: Long,
    val skippedCount: Long = 0,
    val errorCount: Long = 0,
)
