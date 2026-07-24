package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import java.time.Duration

/**
 * 迁移校验接口 —— 每个迁移任务的校验契约。
 *
 * 【设计目的与迁移管线中的角色】
 * MigrationValidator 定义了迁移管线中"校验阶段"的核心契约。
 * 迁移工具将"写入"与"校验"彻底分离：
 * - MigrationTask.execute 负责将数据从 V1 写入 V2
 * - MigrationValidator.validate 负责校验写入后的数据是否正确
 *
 * 这种分离带来了两个关键优势：
 * 1. **validate 命令可重复执行**：校验只读取数据、不修改数据，
 *    因此可以随时重新运行校验，无需担心副作用。
 *    这在排查迁移问题时非常有用——可以反复校验而不影响已有数据。
 * 2. **校验与迁移可独立演进**：迁移逻辑和校验逻辑可以独立开发、
 *    独立测试、独立部署，不会互相干扰。
 *
 * 【校验内容】
 * 每个迁移任务至少注册一个同 ID 的 Validator，校验该任务迁移后的数据：
 * - 数量一致性：V1 源数据总量与 V2 目标数据总量是否匹配
 * - 引用完整性：外键引用是否有效（如产品引用的分类是否存在）
 * - 业务规则：唯一性约束、状态合法性等业务规则是否满足
 * - 精确金额：数值型字段的聚合值是否精确匹配
 *
 * 【与其他组件的连接】
 * - 每个 MigrationValidator 通过 taskId 与对应的 MigrationTask 关联
 * - StandardValidationPlan.create() 注册所有 Validator 实例
 * - MigrationContext 提供校验所需的数据库连接和运行上下文
 * - ValidationResult 是 validate 的返回类型，汇总校验结果
 * - ValidationReport 聚合所有 ValidationResult，提供整体通过/失败判定
 *
 * 【Kotlin 语法要点】
 * - interface：定义纯契约，不提供实现，与 MigrationTask 接口对称设计
 * - val taskId：接口属性声明，实现类必须提供该属性
 * - fun validate(context: MigrationContext): ValidationResult：
 *   抽象方法，实现类必须提供校验逻辑
 */
interface MigrationValidator {
    /**
     * 本校验器对应的迁移任务 ID。
     *
     * 与 MigrationTask.id 使用相同的 MigrationTaskId 枚举值，
     * 建立校验器与迁移任务的一对一映射关系。
     * 例如 TenantValidator.taskId == MigrationTaskId.TENANT，
     * 对应 TenantMigration.id == MigrationTaskId.TENANT。
     */
    val taskId: MigrationTaskId

    /**
     * 执行校验，返回校验结果。
     *
     * 【幂等性】
     * 校验只读取数据、不修改数据，因此天然幂等，可安全重复调用。
     *
     * 【实现要求】
     * - 读取 V1 源数据和 V2 目标数据，进行对比校验
     * - 收集所有违规项到 violations 列表
     * - 记录关键指标到 metrics 映射（如 "v1_count" → "100"）
     * - 计算校验耗时
     *
     * @param context 迁移上下文，提供数据库连接和运行信息
     * @return 校验结果，包含通过状态、指标、违规项和耗时
     */
    fun validate(context: MigrationContext): ValidationResult
}

/**
 * 单个任务的校验结果 —— 记录一次校验执行的完整信息。
 *
 * 【设计目的与迁移管线中的角色】
 * ValidationResult 是校验管线的核心数据载体，记录了单个迁移任务
 * 校验后的所有信息：是否通过、关键指标、违规项、耗时。
 * 它是 ValidationReport 的组成部分，最终汇总到迁移报告中。
 *
 * 【校验内容】
 * - taskId：标识本结果属于哪个任务的校验
 * - passed：校验是否通过（violations 为空则通过）
 * - metrics：关键指标映射，如 {"v1_count": "100", "v2_count": "100", "match": "true"}
 * - violations：违规项列表，每项是一条人类可读的违规描述
 * - duration：校验耗时，用于性能分析和报告
 *
 * 【与其他组件的连接】
 * - MigrationValidator.validate() 返回此数据类
 * - ValidationReport.results 持有所有 ValidationResult 实例
 * - ProgressReporter 可输出此结果到 CLI/日志
 *
 * 【Kotlin 语法要点】
 * - data class：纯数据容器，自动生成 equals/hashCode/copy/toString
 * - Map<String, String>：指标使用字符串键值对，灵活且易于序列化/日志输出
 * - List<String>：违规项使用字符串列表，简单直观
 * - Duration：Java 标准库的时间长度类型，精确到纳秒
 */
data class ValidationResult(
    /**
     * 本校验结果对应的迁移任务 ID。
     *
     * 与 MigrationValidator.taskId 和 MigrationTask.id 一致，
     * 用于将校验结果关联到具体的迁移任务。
     */
    val taskId: MigrationTaskId,
    /**
     * 校验是否通过。
     *
     * 当 violations 为空时 passed=true，表示所有校验项均通过；
     * 当 violations 非空时 passed=false，表示存在数据不一致或违规。
     */
    val passed: Boolean,
    /**
     * 关键指标映射 —— 记录校验过程中采集的统计信息。
     *
     * 键值对均为 String 类型，便于日志输出和报告展示，例如：
     * - "v1_count" → "100"：V1 源数据总量
     * - "v2_count" → "100"：V2 目标数据总量
     * - "id_set_match" → "true"：ID 集合是否完全匹配
     * - "total_quantity" → "5000.00"：聚合数量值
     */
    val metrics: Map<String, String>,
    /**
     * 违规项列表 —— 记录所有未通过的校验项。
     *
     * 每条违规项是一条人类可读的描述，例如：
     * - "V1 用户数 100 ≠ V2 用户数 98"
     * - "V2 存在孤儿产品引用了不存在的分类 ID=5"
     * - "角色 'admin' 在 V1 中存在但 V2 中缺失"
     *
     * 列表为空表示校验通过，非空表示存在数据问题。
     */
    val violations: List<String>,
    /**
     * 校验耗时 —— 从校验开始到结束的时间长度。
     *
     * 用于性能分析：如果某个校验耗时过长，可能需要优化查询
     * 或考虑增量校验策略。Duration 精确到纳秒，
     * 但报告展示时通常取秒或毫秒级别。
     */
    val duration: Duration,
)

/**
 * 校验报告 —— 聚合所有任务的校验结果。
 *
 * 【设计目的与迁移管线中的角色】
 * ValidationReport 是校验管线的最终输出，汇总了所有迁移任务的校验结果。
 * 它提供了整体通过/失败的判定（passed 计算属性），
 * 是运维人员判断迁移是否成功的关键依据。
 *
 * 【校验内容】
 * - results：所有任务的校验结果列表
 * - passed：计算属性，当且仅当所有结果都通过时为 true
 *
 * 【与其他组件的连接】
 * - 由校验 Runner 收集所有 MigrationValidator.validate() 的返回值构建
 * - ProgressReporter 输出此报告到 CLI/日志
 * - 可作为迁移是否可以上线的决策依据
 *
 * 【Kotlin 语法要点】
 * - data class：纯数据容器，自动生成 equals/hashCode/copy/toString
 * - computed property（计算属性）：passed 没有幕后字段，
 *   每次访问时通过 results.all(ValidationResult::passed) 重新计算。
 *   这保证了 passed 始终与 results 保持一致，不会出现"修改了 results
 *   但忘记更新 passed"的问题。
 * - results.all()：Kotlin 标准库函数，当列表为空时返回 true
 *   （空列表的 all 条件 vacuously true），语义合理——没有校验项则默认通过。
 * - ValidationResult::passed：函数引用（method reference），
 *   等价于 { it.passed }，更简洁。
 */
data class ValidationReport(
    /**
     * 所有任务的校验结果列表。
     *
     * 列表顺序通常与 StandardValidationPlan 中的注册顺序一致，
     * 便于按依赖层次逐层查看校验结果。
     */
    val results: List<ValidationResult>,
) {
    /**
     * 整体校验是否通过 —— 当且仅当所有任务的校验结果都通过时为 true。
     *
     * 这是一个计算属性（computed property），没有幕后字段，
     * 每次访问时根据 results 实时计算，保证与 results 始终一致。
     * 如果任何一个 ValidationResult.passed 为 false，则整体不通过。
     */
    val passed: Boolean = results.all(ValidationResult::passed)
}

/**
 * 骨架校验器基类 —— 未实现的校验器绝不返回"通过"。
 *
 * 【设计目的与迁移管线中的角色】
 * 本类是迁移管线中所有校验器的抽象基类，与 PlannedMigrationTask
 * 采用相同的"防空跑"设计模式。在迁移工具的"骨架开发"阶段，
 * 先定义所有校验器的结构和 ID 映射，但暂不实现具体的校验逻辑。
 * 本类确保未实现的校验器不会静默地返回"通过"结果——
 * 而是抛出 UnsupportedOperationException，强制开发者在完成实现时
 * 显式覆盖 validate 方法。
 *
 * 【为什么校验器也需要"防空跑"机制】
 * 如果未实现的校验器默认返回 passed=true，那么迁移报告会显示
 * "所有校验通过"，给运维人员错误的安全感——实际上校验根本没有执行。
 * 数据可能存在严重的不一致问题。这种"假通过"比"显式失败"危险得多：
 * 1. 迁移报告显示所有校验通过，但数据可能已丢失或损坏
 * 2. 问题在生产环境中才暴露，修复成本极高
 * 3. 数据不一致可能影响业务逻辑的正确性
 *
 * 【与 PlannedMigrationTask 的对称设计】
 * 本类与 PlannedMigrationTask 采用完全相同的防空跑模式：
 * - PlannedMigrationTask：未实现的迁移任务抛出异常，防止"空跑成功"
 * - PlannedMigrationValidator：未实现的校验器抛出异常，防止"空校验通过"
 * 两者共同确保：骨架阶段任何组件都不能静默地报告"一切正常"。
 *
 * 【与其他组件的连接】
 * - 所有具体校验器（TenantValidator、UserValidator 等）都继承本类
 * - StandardValidationPlan 中列出的所有校验器实例都是本类的子类
 * - MigrationContext 提供校验所需的数据库连接和运行上下文
 * - 校验 Runner 捕获 UnsupportedOperationException 后标记校验为"未实现"
 *
 * 【Kotlin 语法要点】
 * - abstract class：抽象类，不能直接实例化，必须被子类继承
 * - final override：Kotlin 中 open/final 控制继承覆盖。
 *   final override 表示这是对接口属性的最终覆盖，子类不能再覆盖。
 *   这确保了校验器的 taskId 在子类构造后不可更改，
 *   防止子类意外修改校验器与迁移任务的映射关系。
 * - throw 作为表达式：Kotlin 中 throw 是表达式（返回 Nothing 类型），
 *   可以直接作为函数体，无需额外的大括号或 return
 * - UnsupportedOperationException：Java 标准异常，表示请求的操作不支持，
 *   此处用于标记"此方法不应被调用，需要子类覆盖"
 */
abstract class PlannedMigrationValidator(
    /**
     * 本校验器对应的迁移任务 ID。
     *
     * 使用 final override 确保子类在构造时指定后不可更改。
     * taskId 建立了校验器与迁移任务的一对一映射关系，
     * 例如 TenantValidator 的 taskId 为 MigrationTaskId.TENANT，
     * 对应 TenantMigration 的 id。
     */
    final override val taskId: MigrationTaskId,
) : MigrationValidator {
    /**
     * 执行校验的默认实现 —— 抛出异常。
     *
     * 【安全机制】
     * 任何未覆盖此方法的子类在运行时会立即抛出异常，
     * 异常消息包含校验器名和运行 ID，便于定位问题：
     * - taskId.cliName：人类可读的校验器名，快速识别是哪个校验器未实现
     * - context.runId：迁移运行 ID，关联到具体的迁移执行记录
     *
     * 【实现者指南】
     * 实现者完成校验器时应：
     * 1. 覆盖 validate 方法，编写具体的数据校验逻辑
     * 2. 删除该校验器继承到的占位行为（即本方法）
     * 3. 确保返回的 ValidationResult 包含准确的指标和违规项
     *
     * @param context 迁移执行上下文，提供数据库连接和运行信息
     * @return 永远不会正常返回，总是抛出异常
     * @throws UnsupportedOperationException 始终抛出，表示校验器未实现
     */
    override fun validate(context: MigrationContext): ValidationResult =
        throw UnsupportedOperationException(
            "Validator ${taskId.cliName} is not implemented (runId=${context.runId})",
        )
}
