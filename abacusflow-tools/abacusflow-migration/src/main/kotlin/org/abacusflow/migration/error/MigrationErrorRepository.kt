package org.abacusflow.migration.error

import org.abacusflow.migration.framework.MigrationTaskId
import java.time.Instant
import java.util.UUID

/**
 * 迁移错误记录，记录迁移过程中遇到的每一条错误。
 *
 * 【设计目的与系统角色】
 * 迁移过程中可能遇到各种错误（数据格式不兼容、唯一约束冲突、外键引用缺失等）。
 * 本类将错误信息结构化记录，用于：
 * - 事后分析：了解哪些记录迁移失败、失败原因是什么；
 * - 重试决策：通过 retryable 字段区分可重试和不可重试的错误；
 * - 进度监控：统计错误数量，评估迁移质量。
 *
 * 【字段说明】
 * @param runId       关联的迁移运行 ID，与 [org.abacusflow.migration.run.MigrationRun.runId] 对应
 * @param taskId      出错的迁移任务标识
 * @param stream      出错的子流名称
 * @param recordKey   出错记录的标识键（如 V1 的主键值），用于定位具体哪条数据有问题
 * @param message     错误消息，描述失败原因。会被截断到 2000 字符以适应数据库字段长度
 * @param retryable   是否可重试。true 表示临时性错误（如网络超时），重试可能成功；
 *                    false 表示永久性错误（如数据格式不兼容），需要人工修复
 * @param createdAt   错误记录的创建时间
 *
 * 【安全考量】
 * - 不允许在错误记录中落密码或完整个人数据（如身份证号、手机号等）；
 * - recordKey 只记录业务主键，不记录敏感字段值；
 * - message 只记录技术性错误描述，不包含数据内容。
 */
data class MigrationError(
    val runId: UUID,
    val taskId: MigrationTaskId,
    val stream: String,
    val recordKey: String,
    val message: String,
    val retryable: Boolean,
    val createdAt: Instant,
)

/**
 * 迁移错误记录仓储的端口（Port）。
 *
 * 【设计目的与系统角色】
 * 本接口定义了迁移引擎对错误控制表的写入契约。错误记录是迁移过程的"黑匣子"，
 * 即使迁移失败，错误信息也必须保留，以便事后分析。
 *
 * 【Kotlin 语法：fun interface（函数式接口 / SAM 接口）】
 * `fun interface` 标记本接口只有一个抽象方法 [record]。
 * 这意味着可以用 Lambda 简洁地创建实现：
 *   val repo: MigrationErrorRepository = MigrationErrorRepository { error -> ... }
 * 虽然生产实现 [JooqMigrationErrorRepository] 较复杂，但 fun interface 标记了
 * 这是一个功能性契约，且方便测试时用 Lambda 创建 Mock。
 *
 * 【关键设计：使用独立事务，不与业务批次共享】
 * 与 [org.abacusflow.migration.checkpoint.MigrationCheckpointRepository] 不同，
 * 错误记录使用独立事务（由实现类自行管理），原因：
 * 1. 错误记录是"观测数据"，不应随业务批次回滚而丢失；
 * 2. 即使当前批次失败回滚，错误信息仍需保留以便事后分析；
 * 3. 错误记录的写入不应影响业务批次的事务边界；
 * 4. 错误记录写入失败不应导致业务批次回滚。
 *
 * 因此接口方法签名中没有 DSLContext 参数——实现类自行管理事务。
 *
 * 【安全约束】
 * - 不允许在错误记录中落密码或完整个人数据；
 * - 实现类应对 message 和 recordKey 做长度截断，防止超长文本导致数据库写入失败。
 */
fun interface MigrationErrorRepository {
    /**
     * 记录一条迁移错误。
     *
     * 实现保证：
     * - 使用独立短事务写入，不受业务批次事务影响；
     * - 对 message 和 recordKey 做长度截断，防止超长文本导致写入失败；
     * - 写入失败时不应抛出异常影响主流程（可记录日志后继续）。
     *
     * @param error 要记录的迁移错误
     */
    fun record(error: MigrationError)
}
