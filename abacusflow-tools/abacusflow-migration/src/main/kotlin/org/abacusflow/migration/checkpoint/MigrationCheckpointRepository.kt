package org.abacusflow.migration.checkpoint

import org.abacusflow.migration.framework.MigrationTaskId
import org.jooq.DSLContext
import java.time.Instant
import java.util.UUID

/**
 * Checkpoint 的复合键，唯一标识一个迁移任务的某个流（stream）的断点位置。
 *
 * 【设计目的】
 * 迁移过程中需要记录"处理到了哪里"，以便中断后能从断点恢复，而非从头开始。
 * CheckpointKey 定义了断点的唯一标识维度。
 *
 * 【为什么需要 stream 字段？】
 * 有些迁移任务内部可能有多个独立的子流（stream），例如：
 * - 一个"产品迁移"任务可能同时迁移产品基本信息和产品分类，两者独立推进；
 * - 一个"交易迁移"任务可能按年份或按类型分成多个流并行处理；
 * 单纯用 last_processed_id 无法区分不同子流的进度，因此引入 stream 维度。
 * 对于简单任务，stream 默认为 "default"，不影响使用。
 *
 * 【Kotlin 语法：data class】
 * - 自动生成 equals/hashCode：CheckpointKey 适合作为 Map 的 key，
 *   也可以在集合中正确去重；
 * - 自动生成 toString：格式为 `CheckpointKey(taskId=ProductMigration, stream=default)`；
 * - 自动生成 copy：`key.copy(stream = "category")` 创建新的 key 实例。
 *
 * @param taskId  迁移任务标识，来自框架层的 [MigrationTaskId] 枚举/密封类
 * @param stream  子流名称，默认 "default"。复合任务使用不同 stream 值区分各子流
 */
data class CheckpointKey(
    val taskId: MigrationTaskId,
    val stream: String = "default",
)

/**
 * 迁移断点记录，保存某个任务流在某个时刻的处理进度。
 *
 * 【设计目的与系统角色】
 * 断点是迁移引擎实现"可恢复性"的核心数据结构。每处理完一批数据后，
 * 迁移引擎会更新断点记录。如果迁移中断（网络故障、进程崩溃等），
 * 重启后引擎会读取断点，从上次处理到的位置继续，避免重复处理。
 *
 * 【字段说明】
 * @param key                   复合键（taskId + stream），唯一标识一个断点
 * @param cursor                游标值，表示"已处理到的位置"。可以是 ID、时间戳、
 *                              或任何能标识进度的值。null 表示尚未开始。
 *                              使用 String 而非 Long 是因为不同任务的游标类型可能不同
 *                              （ID、日期、复合键等），String 可以统一表示。
 * @param processedCount        已处理的记录总数，用于进度报告和统计
 * @param runId                 当前迁移运行的 UUID，用于关联 [org.abacusflow.migration.run.MigrationRun]
 * @param implementationVersion 实现版本号，用于检测任务逻辑是否变更。
 *                              如果迁移任务的业务逻辑修改了（如字段映射变化），
 *                              版本号应递增，引擎会根据版本号决定是否需要重新迁移。
 * @param updatedAt             最后更新时间，用于监控和审计
 *
 * 【与 run/error 的关系】
 * - 一个 MigrationRun 包含多个 task 的执行记录；
 * - 一个 task 可以有多个 stream（通过 CheckpointKey 区分）；
 * - 每个 stream 有一个 checkpoint 记录和可能的 error 记录；
 * - checkpoint 和业务数据共享事务（原子提交），error 使用独立事务（不被业务回滚影响）。
 */
data class MigrationCheckpoint(
    val key: CheckpointKey,
    val cursor: String?,
    val processedCount: Long,
    val runId: UUID,
    val implementationVersion: Int,
    val updatedAt: Instant,
)

/**
 * 迁移控制表——断点仓储的端口（Port）。
 *
 * 【设计目的与系统角色】
 * 本接口定义了迁移引擎对断点控制表的访问契约。断点仓储是迁移引擎实现
 * "可恢复性"的关键组件，负责持久化每个任务流的处理进度。
 *
 * 【关键设计：save 必须使用业务批次传入的 transaction DSLContext】
 * 这是本接口最重要的设计约束。save 方法的参数名是 `transaction` 而非 `dsl`，
 * 明确表示它必须在业务事务内调用：
 *
 *   target.transaction { dsl ->
 *       writeBusinessData(dsl, batch)               // 业务写入
 *       checkpointRepo.save(dsl, newCheckpoint)      // 断点更新——共享同一事务
 *   }  // commit 时业务数据和断点原子性地一起持久化
 *
 * 如果 save 使用独立事务，可能出现：
 * - 业务数据写入成功但断点更新失败 → 重启后重复写入（幂等性可缓解但浪费资源）；
 * - 断点更新成功但业务数据回滚 → 重启后跳过这批数据（数据丢失！）。
 * 因此断点必须与业务数据原子提交。
 *
 * 【关键设计：find 也需要 DSLContext 参数】
 * find 方法接收 DSLContext 而非自己创建连接，原因：
 * - 在事务内读取断点时，必须使用事务的 DSLContext 以保证读一致性；
 * - 如果 find 自己创建连接读取，可能读到旧的断点值（因为事务隔离），
 *   导致错误的增量计算。
 *
 * 【与 error/run 仓储的事务策略对比】
 * | 仓储       | 事务策略           | 原因                                      |
 * |-----------|-------------------|-------------------------------------------|
 * | checkpoint | 共享业务事务        | 断点和业务数据必须原子提交，否则数据不一致    |
 * | error      | 独立短事务          | 错误记录是观测数据，不应随业务回滚而丢失      |
 * | run        | 独立短事务          | 运行状态（FAILED）必须在业务回滚后仍可见      |
 */
interface MigrationCheckpointRepository {
    /**
     * 查找指定任务流的断点记录。
     *
     * @param dsl  DSLContext，可能是事务内的，以保证读一致性
     * @param key  要查找的断点复合键（taskId + stream）
     * @return 断点记录，如果不存在则返回 null（表示尚未开始该任务流）
     */
    fun find(
        dsl: DSLContext,
        key: CheckpointKey,
    ): MigrationCheckpoint?

    /**
     * 保存（插入或更新）断点记录。
     *
     * 【重要】transaction 参数必须来自业务批次的事务 DSLContext，
     * 以保证断点和业务数据的原子性。不要在此方法内创建新事务。
     *
     * @param transaction  业务批次的事务 DSLContext（由 [org.abacusflow.migration.database.TargetDatabase.transaction] 提供）
     * @param checkpoint   要保存的断点记录
     */
    fun save(
        transaction: DSLContext,
        checkpoint: MigrationCheckpoint,
    )
}
