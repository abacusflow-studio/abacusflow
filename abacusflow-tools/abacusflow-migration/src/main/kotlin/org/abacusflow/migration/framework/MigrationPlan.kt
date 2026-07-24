package org.abacusflow.migration.framework

/**
 * 迁移计划 —— 固定有序的任务列表容器。
 *
 * ## 设计目的
 * MigrationPlan 封装了"有哪些迁移任务"和"它们以什么顺序执行"这两个关注点。
 * 它是 [MigrationRunner] 的核心输入，将任务注册与任务执行解耦：
 * - [StandardMigrationPlan] 负责注册所有任务实例（组装阶段）
 * - [MigrationRunner] 负责执行任务（运行阶段）
 * - MigrationPlan 是两者之间的桥梁
 *
 * ## 为什么用固定顺序而非 DAG/拓扑排序
 * - 任务数量有限（16个），依赖关系已知且稳定
 * - 固定顺序简单、可预测、易调试：看任务列表就知道执行顺序
 * - 拓扑排序虽然更通用，但引入了不必要的复杂度：
 *   - 需要构建 DAG、检测环、处理并行分支
 *   - 调试时执行顺序不直观，每次运行可能不同
 *   - 当前所有依赖都是线性的（A→B→C），没有可并行的独立分支
 * - 如果未来任务数量激增且有可并行分支，可以切换到 DAG 模型
 * - **YAGNI 原则**（You Aren't Gonna Need It）：当前不需要就不做
 *
 * ## 为什么不是 data class
 * MigrationPlan 有行为方法（resolve），不仅仅是数据容器。
 * Kotlin 的 data class 语义上强调"数据持有"，适合纯数据对象。
 * 虽然技术上 data class 也可以有方法，但用普通 class 更符合语义。
 *
 * ## resolve 方法的工作原理
 * ```
 * 输入：MigrationSelection（All 或 Selected）
 *   ↓
 * All → 直接返回全部任务列表（tasks）
 * Selected → 计算依赖闭包 → 按固定顺序过滤出闭包内的任务
 *   ↓
 * 输出：有序的任务列表
 * ```
 *
 * 关键：即使 Selected 指定了乱序的任务，resolve 返回的列表仍然按固定顺序排列。
 * 因为 tasks.filter { it.id in closure } 保持了 tasks 中的原始顺序。
 * 这保证了依赖关系始终被满足：上游任务一定在下游任务之前执行。
 *
 * ## 与系统的连接
 * - [StandardMigrationPlan.create()] 构造 MigrationPlan 实例，注册所有任务
 * - [MigrationRunner] 构造时接收 MigrationPlan，运行时调用 resolve 获取任务列表
 * - [MigrationSelection] 决定 resolve 的过滤行为
 * - 各 [MigrationTask] 实例通过 tasks 列表注册到计划中
 */
class MigrationPlan(
    /**
     * 按固定执行顺序排列的迁移任务列表。
     *
     * 列表顺序即执行顺序，由 [StandardMigrationPlan] 在构造时确定。
     * 这个顺序必须满足所有任务的依赖约束（即上游任务排在下游之前）。
     */
    val tasks: List<MigrationTask>,
) {
    /**
     * 根据选择模型解析出要执行的任务列表。
     *
     * ## Kotlin when 表达式的穷举性
     * 因为 MigrationSelection 是 sealed interface，Kotlin 编译器知道
     * 只有 All 和 Selected 两种可能，因此 when 不需要 else 分支。
     * 如果未来新增 MigrationSelection 的子类型，编译器会报错提醒补全分支。
     * 这是 sealed 类型 + when 组合的核心优势：编译期保证穷举。
     *
     * ## Selected 分支的处理
     * 1. 调用 [MigrationSelection.resolveClosure] 计算依赖闭包
     *    - 例如用户指定 SALE_ORDER，闭包会自动补齐 CUSTOMER、INVENTORY、
     *      PRODUCT、DEPOT、TENANT 等所有上游依赖
     * 2. 用 tasks.filter { it.id in closure } 过滤出闭包内的任务
     *    - filter 保持原始顺序，所以返回的列表仍然是有序的
     *    - `in` 操作符对 Set 是 O(1) 查找（closure 是 Set 类型）
     *
     * @param selection 选择模型（All 或 Selected）
     * @return 按固定顺序排列的要执行的任务列表
     */
    fun resolve(selection: MigrationSelection): List<MigrationTask> =
        when (selection) {
            is MigrationSelection.All -> tasks
            is MigrationSelection.Selected -> {
                val closure = MigrationSelection.resolveClosure(selection.taskIds)
                tasks.filter { it.id in closure }
            }
        }
}
