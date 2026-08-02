package org.abacusflow.migration.run

import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import java.time.Instant
import java.util.UUID

/**
 * 迁移运行状态枚举，表示一次迁移运行的生命周期阶段。
 *
 * 【设计目的】
 * 迁移运行是一个有限状态机：
 *   RUNNING → SUCCEEDED（所有任务成功完成）
 *   RUNNING → FAILED（某个任务失败且 failFast=true，或运行异常）
 *
 * - RUNNING：运行中，至少有一个任务正在执行；
 * - SUCCEEDED：所有选中的任务都成功完成；
 * - FAILED：运行失败，可能是任务失败或系统异常。
 *
 * 【Kotlin 语法：enum class】
 * Kotlin 的 enum class 与 Java 的 enum 类似，但更简洁：
 * - 每个枚举值是类的实例，可以有自己的属性和方法；
 * - 自动生成 name（字符串名称）和 ordinal（序号）属性；
 * - 自动生成 values() 和 valueOf() 方法；
 * - 可以实现接口、添加属性和方法。
 * 本枚举较简单，只定义了三个状态值，没有额外属性。
 */
enum class MigrationRunStatus {
    RUNNING,
    SUCCEEDED,
    FAILED,
}

/**
 * 迁移运行记录，表示一次完整的迁移执行。
 *
 * 【设计目的与系统角色】
 * 一次迁移运行（MigrationRun）是迁移工具的顶层执行单元，包含：
 * - 哪些任务被选中执行（selectedTasks）；
 * - 运行的开始和结束时间；
 * - 运行的最终状态（成功/失败）。
 *
 * 运行记录用于：
 * - 审计追踪：记录每次迁移的执行历史；
 * - 进度监控：查看当前运行的状态和耗时；
 * - 错误关联：[org.abacusflow.migration.error.MigrationError] 通过 runId 关联到具体运行；
 * - 断点关联：[org.abacusflow.migration.checkpoint.MigrationCheckpoint] 通过 runId 标识断点所属的运行。
 *
 * 【字段说明】
 * @param runId          运行的唯一标识（UUID），在运行开始时生成，贯穿整个迁移过程
 * @param status         运行状态（RUNNING/SUCCEEDED/FAILED）
 * @param selectedTasks  本次运行选中的任务集合，来自 [MigrationTaskId]
 * @param startedAt      运行开始时间
 * @param finishedAt     运行结束时间，运行中为 null
 *
 * 【与 task_run 的关系】
 * 一次运行包含多个任务执行记录（migration_task_run），是一对多关系：
 *   MigrationRun (1) ←→ (N) MigrationTaskRun
 * 每个 task_run 记录了单个任务的执行状态、处理数量、错误数量等。
 */
data class MigrationRun(
    val runId: UUID,
    val status: MigrationRunStatus,
    val selectedTasks: Set<MigrationTaskId>,
    val startedAt: Instant,
    val finishedAt: Instant?,
)

/**
 * 迁移运行状态仓储的端口（Port）。
 *
 * 【设计目的与系统角色】
 * 本接口定义了迁移引擎对运行控制表的访问契约，负责记录迁移运行的生命周期：
 * 1. start：运行开始，创建运行记录；
 * 2. taskStarted：某个任务开始执行，创建任务执行记录；
 * 3. taskCompleted：某个任务执行完成，更新任务执行记录的统计信息；
 * 4. finish：运行结束，更新运行记录的最终状态。
 *
 * 【关键设计：使用独立短事务】
 * 与 [org.abacusflow.migration.error.MigrationErrorRepository] 相同，
 * 运行状态使用独立事务，不与业务批次共享，原因：
 * 1. 运行状态（尤其是 FAILED）必须在业务回滚后仍然可见；
 * 2. 如果运行状态共享业务事务，业务回滚会导致 FAILED 状态也回滚，
 *    重启后引擎会认为上次运行仍在 RUNNING 状态，可能误判；
 * 3. 运行状态的写入不应影响业务批次的事务边界。
 *
 * 因此接口方法签名中没有 DSLContext 参数——实现类自行管理事务。
 *
 * 【与 checkpoint/error 仓储的事务策略对比】
 * | 仓储       | 事务策略           | 原因                                      |
 * |-----------|-------------------|-------------------------------------------|
 * | checkpoint | 共享业务事务        | 断点和业务数据必须原子提交，否则数据不一致    |
 * | error      | 独立短事务          | 错误记录是观测数据，不应随业务回滚而丢失      |
 * | run        | 独立短事务          | 运行状态（FAILED）必须在业务回滚后仍可见      |
 */
interface MigrationRunRepository {
    /**
     * 记录迁移运行开始。
     *
     * @param run 运行记录（状态应为 RUNNING）
     */
    fun start(run: MigrationRun)

    /**
     * 记录某个任务开始执行。
     *
     * @param runId   运行 ID
     * @param taskId  任务标识
     */
    fun taskStarted(
        runId: UUID,
        taskId: MigrationTaskId,
    )

    /**
     * 记录某个任务执行完成。
     *
     * @param runId   运行 ID
     * @param result  任务执行结果（包含处理数、跳过数、错误数等统计信息）
     */
    fun taskCompleted(
        runId: UUID,
        result: TaskResult,
    )

    /** 记录任务异常终止，避免 task_run 永久停留在 RUNNING。 */
    fun taskFailed(
        runId: UUID,
        taskId: MigrationTaskId,
        finishedAt: Instant,
        message: String?,
    )

    /**
     * 记录迁移运行结束。
     *
     * @param runId       运行 ID
     * @param status      最终状态（SUCCEEDED 或 FAILED）
     * @param finishedAt  结束时间
     * @param message     可选的结束消息（如失败原因描述）
     */
    fun finish(
        runId: UUID,
        status: MigrationRunStatus,
        finishedAt: Instant,
        message: String?,
    )
}
