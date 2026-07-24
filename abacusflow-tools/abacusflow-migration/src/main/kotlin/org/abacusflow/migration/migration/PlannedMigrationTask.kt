package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTask
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult

/**
 * 安全占位基类：骨架阶段任何任务都不能空跑后返回"成功"。
 *
 * 【设计目的与迁移管线中的角色】
 * 本类是迁移管线中所有具体迁移任务的抽象基类。
 * 在迁移工具的"骨架开发"阶段，先定义所有迁移任务的结构和依赖关系，
 * 但暂不实现具体的数据迁移逻辑。本类确保未实现的任务不会静默地
 * 返回"成功"结果——而是抛出 UnsupportedOperationException，强制开发者
 * 在完成实现时显式覆盖 execute 方法。
 *
 * 【为什么需要"防空跑"机制】
 * 如果基类提供默认的"成功"实现（如返回 processedCount=0 的 TaskResult），
 * 那么忘记实现的任务会在迁移运行时静默通过，导致数据丢失而不被发现。
 * 这种"假成功"比"显式失败"危险得多，因为：
 * 1. 迁移报告显示所有任务成功，给运维人员错误的安全感
 * 2. 数据缺失在后续验证阶段才可能被发现，增加排查成本
 * 3. 在生产环境中，数据丢失的后果不可逆
 *
 * 【骨架开发策略】
 * 迁移工具采用"先骨架后实现"的开发策略：
 * 1. 第一阶段：定义所有任务类（继承 PlannedMigrationTask），声明依赖关系
 * 2. 第二阶段：逐个实现具体任务的 execute 方法，删除继承到的占位行为
 * 3. 每实现一个任务，即可独立测试，不影响其他未实现的任务
 *
 * 【与其他组件的连接】
 * - 所有具体迁移任务（TenantMigration、UserMigration、ProductMigration 等）
 *   都继承本类，通过构造函数声明自己的 ID 和依赖
 * - MigrationRunner 通过 MigrationTask 接口调用 execute，
 *   捕获 UnsupportedOperationException 后标记任务为"未实现"
 * - StandardMigrationPlan 中列出的所有任务实例都是本类的子类
 * - MigrationContext 提供执行上下文（数据库连接、检查点、错误记录等）
 *
 * 【Kotlin 语法要点】
 * - abstract class：抽象类，不能直接实例化，必须被子类继承
 * - final override：Kotlin 中 open/final 控制继承覆盖。
 *   final override 表示这是对接口属性的最终覆盖，子类不能再覆盖。
 *   这确保了任务的 id 和 dependencies 在子类构造后不可更改，
 *   防止子类意外修改任务标识或依赖关系。
 * - MigrationTask 接口：定义了迁移任务的核心契约（id、dependencies、execute）
 * - UnsupportedOperationException：Java 标准异常，表示请求的操作不支持，
 *   此处用于标记"此方法不应被调用，需要子类覆盖"
 * - throw 作为表达式：Kotlin 中 throw 是表达式（返回 Nothing 类型），
 *   可以直接作为函数体，无需额外的大括号或 return
 */
abstract class PlannedMigrationTask(
    /**
     * 迁移任务的唯一标识符。
     *
     * 使用 final override 确保子类在构造时指定后不可更改。
     * MigrationTaskId 通常是一个枚举值或数据类，包含：
     * - cliName：命令行显示名称（如 "tenant"、"user"）
     * - 其他元数据（如任务分组、优先级等）
     */
    final override val id: MigrationTaskId,
    /**
     * 本任务依赖的前置任务 ID 集合。
     *
     * 使用 final override 确保子类在构造时指定后不可更改。
     * 依赖关系决定了任务的执行顺序——只有所有前置任务成功完成后，
     * 本任务才会被执行。例如：
     * - UserMigration 依赖 TenantMigration（用户必须归属某个租户）
     * - RolePermissionMigration 依赖 RoleMigration + PermissionMigration
     *   （角色-权限关联需要角色和权限都已迁移）
     */
    final override val dependencies: Set<MigrationTaskId>,
) : MigrationTask {
    /**
     * 执行迁移任务的默认实现——抛出异常。
     *
     * 【安全机制】
     * 任何未覆盖此方法的子类在运行时会立即抛出异常，
     * 异常消息包含任务名和运行 ID，便于定位问题：
     * - id.cliName：人类可读的任务名，快速识别是哪个任务未实现
     * - context.runId：迁移运行 ID，关联到具体的迁移执行记录
     *
     * 【实现者指南】
     * 实现者完成任务时应：
     * 1. 覆盖 execute 方法，编写具体的数据迁移逻辑
     * 2. 删除该任务继承到的占位行为（即本方法）
     * 3. 确保返回的 TaskResult 包含准确的统计信息
     *
     * @param context 迁移执行上下文，提供数据库连接、检查点、错误记录等
     * @return 永远不会正常返回，总是抛出异常
     * @throws UnsupportedOperationException 始终抛出，表示任务未实现
     */
    override fun execute(context: MigrationContext): TaskResult =
        throw UnsupportedOperationException(
            "Task ${id.cliName} is a strategic skeleton and has no data implementation (runId=${context.runId})",
        )
}
