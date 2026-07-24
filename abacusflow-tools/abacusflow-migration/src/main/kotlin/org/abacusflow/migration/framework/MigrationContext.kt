package org.abacusflow.migration.framework

import org.abacusflow.migration.checkpoint.MigrationCheckpointRepository
import org.abacusflow.migration.config.MigrationOptions
import org.abacusflow.migration.database.SourceDatabase
import org.abacusflow.migration.database.TargetDatabase
import org.abacusflow.migration.error.MigrationErrorRepository
import org.abacusflow.migration.report.ProgressReporter
import org.abacusflow.migration.run.MigrationRunRepository
import java.time.Clock
import java.util.UUID

/**
 * 迁移上下文 —— 单次迁移运行共享的显式依赖容器。
 *
 * ## 设计目的
 * MigrationContext 将一次迁移运行所需的所有基础设施依赖集中在一个对象中，
 * 避免在各个组件之间传递零散的参数。它是整个框架的"服务定位器"，
 * 但与传统的 Service Locator 模式不同：
 * - **显式依赖**：所有依赖都在构造函数中声明，不隐藏
 * - **不可变**：所有字段都是 val，运行期间不会改变
 * - **无全局状态**：每次运行创建新的 context，不使用全局单例或线程上下文
 *
 * ## 为什么不用 Spring 依赖注入
 * 迁移工具是一个独立的 CLI 应用，不运行在 Spring 容器中。
 * 使用纯 Kotlin 的 data class 作为依赖容器更轻量、更透明：
 * - 不需要 Spring 的启动时间
 * - 依赖关系一目了然，不需要追踪 @Autowired
 * - 测试时直接构造，不需要 Mock 容器
 *
 * ## 为什么强调"不要使用全局单例或隐藏的线程上下文"
 * - 迁移工具可能未来支持并行运行多个迁移任务
 * - 全局单例（如 Java 的 ThreadLocal）在并行场景下容易出错
 * - 显式传递 context 让依赖关系清晰，便于理解和测试
 * - 这也是函数式编程的核心原则：避免隐式状态
 *
 * ## data class 的选择
 * MigrationContext 是纯数据容器，所有字段都是不可变的 val，
 * 没有业务逻辑方法，用 data class 最合适：
 * - 自动生成 equals/hashCode：两个 context 的所有字段相同则视为相等
 * - 自动生成 toString：调试时可以看到所有依赖的值
 * - 自动生成 copy：可以基于现有 context 创建变体（如替换 clock 用于测试）
 *
 * ## 各字段的职责
 * - **runId**：本次运行的唯一标识，贯穿所有 checkpoint、error、run 记录
 * - **source**：V1 旧数据库（只读），提供待迁移的源数据
 * - **target**：V2 新数据库（读写），接收迁移后的数据，也存储 checkpoint
 * - **checkpoints**：断点仓库，记录每个任务的迁移进度
 * - **errors**：错误仓库，记录迁移过程中的失败记录
 * - **runs**：运行仓库，记录每次迁移运行的状态
 * - **options**：运行配置，如批大小、是否 failFast 等
 * - **progress**：进度报告器，向 CLI/日志输出迁移进度
 * - **clock**：时钟，默认 UTC，测试时可替换为固定时钟
 *
 * ## Clock 的设计
 * `clock: Clock = Clock.systemUTC()` 使用默认参数值：
 * - 生产环境使用 UTC 时钟（默认值）
 * - 测试环境传入固定时钟（Clock.fixed），让时间可控
 * - 所有时间相关操作（Instant.now(clock)）都通过此 clock，
 *   保证测试中时间确定性，不会因真实时间流逝导致断言失败
 *
 * ## 与系统的连接
 * - [MigrationRunner.run] 接收 context，传递给每个 [MigrationTask.execute]
 * - [BatchProcessor.processBatches] 接收 context，访问数据库和仓库
 * - [MigrationApplicationFactory] 负责组装 context 的所有依赖
 * - 各 [MigrationTask] 实现通过 context 访问所需的基础设施
 */
data class MigrationContext(
    /**
     * 本次迁移运行的唯一标识。
     *
     * UUID 保证全局唯一，即使多个迁移实例同时运行也不会冲突。
     * runId 用于关联：
     * - checkpoint 表：哪些断点属于本次运行
     * - error 表：哪些错误属于本次运行
     * - run 表：本次运行的状态记录
     */
    val runId: UUID,
    /**
     * V1 源数据库（只读）。
     *
     * [SourceDatabase] 接口只提供 read 方法，不提供写入能力。
     * 实现类（JooqSourceDatabase）会设置 readOnly=true、fetchSize 和游标读取，
     * 禁止把全表加载到 JVM 内存中。
     */
    val source: SourceDatabase,
    /**
     * V2 目标数据库（读写）。
     *
     * [TargetDatabase] 接口提供 read 和 transaction 方法。
     * transaction 方法保证：业务写入和同批 checkpoint 保存共享同一个事务，
     * 确保数据一致性（要么都成功，要么都回滚）。
     */
    val target: TargetDatabase,
    /**
     * 断点仓库 —— 记录每个任务的迁移进度。
     *
     * 每个任务可以有多个 checkpoint stream（如 product-category 和 product），
     * 通过 [CheckpointKey]（taskId + stream）唯一标识。
     * checkpoint 记录了 cursor（游标位置）和 processedCount（已处理数量）。
     */
    val checkpoints: MigrationCheckpointRepository,
    /**
     * 错误仓库 —— 记录迁移过程中的失败记录。
     *
     * 每条错误记录包含 taskId、recordKey（出错记录的标识）、
     * message（错误信息）、retryable（是否可重试）等信息。
     * 非 failFast 模式下，错误被记录后继续运行，事后可分析错误表。
     */
    val errors: MigrationErrorRepository,
    /**
     * 运行仓库 —— 记录每次迁移运行的状态。
     *
     * 记录运行开始/结束时间、选中任务、最终状态（RUNNING/SUCCEEDED/FAILED）。
     * 也记录每个任务的开始/完成状态。
     */
    val runs: MigrationRunRepository,
    /**
     * 迁移运行配置。
     *
     * 包含 batchSize（每批记录数）、fetchSize（JDBC 获取大小）、
     * controlSchema（checkpoint/error 表所在的 schema）、
     * failFast（是否快速失败）等配置项。
     * 从 YAML 配置文件加载，详见 [MigrationConfig]。
     */
    val options: MigrationOptions,
    /**
     * 进度报告器 —— 向 CLI/日志输出迁移进度。
     *
     * 抽象了进度展示方式：可能是 CLI 进度条、日志输出、或静默（测试时）。
     * 报告任务开始/完成、批次完成等事件。
     */
    val progress: ProgressReporter,
    /**
     * 时钟 —— 提供当前时间。
     *
     * 默认使用 UTC 时钟（Clock.systemUTC()）。
     * 测试时可替换为固定时钟（Clock.fixed），让时间可控。
     * 所有 Instant.now(clock) 调用都通过此 clock，保证时间一致性。
     */
    val clock: Clock = Clock.systemUTC(),
)
