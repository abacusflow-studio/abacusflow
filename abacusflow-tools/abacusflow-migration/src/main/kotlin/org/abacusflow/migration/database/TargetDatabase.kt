package org.abacusflow.migration.database

import org.jooq.DSLContext

/**
 * V2 目标库的读写数据库访问端口（Port）。
 *
 * 【设计目的与系统角色】
 * 在六边形架构中，本接口定义了迁移工具对 V2 新数据库的访问契约。
 * 与 [SourceDatabase] 的只读语义不同，目标库需要写入迁移数据，
 * 并且需要事务支持以保证数据一致性。
 *
 * 【设计选择：read + transaction 双方法】
 * - `read`：用于查询目标库已有数据（如检查记录是否已存在、读取租户信息等），
 *   在独立的自动提交=false 的连接上执行，不开启显式事务。
 * - `transaction`：用于写入业务数据和 checkpoint，是迁移的核心操作。
 *   事务保证"业务数据写入 + checkpoint 更新"要么同时成功，要么同时回滚。
 *
 * 【关键设计：checkpoint 与业务数据共享事务】
 * 每批迁移的写入流程是：
 *   target.transaction { dsl ->
 *       // 1. 写入业务数据（产品、库存、交易等）
 *       businessDataWriter.write(dsl, batch)
 *       // 2. 更新 checkpoint（记录已处理到的位置）
 *       checkpointRepo.save(dsl, newCheckpoint)
 *       // 3. 事务提交——业务数据和 checkpoint 原子性地一起持久化
 *   }
 * 如果 checkpoint 使用独立事务，可能出现：
 * - 业务数据写入成功但 checkpoint 更新失败 → 重启后会重复写入（幂等性可缓解但浪费资源）
 * - checkpoint 更新成功但业务数据回滚 → 重启后会跳过这批数据（数据丢失！）
 * 因此 checkpoint 必须与业务数据共享同一个事务，这是本接口设计的核心约束。
 *
 * 【与 error/run 仓储的对比】
 * 与 checkpoint 不同，[org.abacusflow.migration.error.MigrationErrorRepository] 和
 * [org.abacusflow.migration.run.MigrationRunRepository] 使用独立事务（通过本接口的
 * transaction 方法各自开启），原因：
 * - 错误记录和运行状态是"观测数据"，不应随业务批次回滚而丢失；
 * - 即使当前批次失败回滚，错误信息仍需保留以便事后分析；
 * - 运行状态（FAILED）也必须在业务回滚后仍然可见。
 *
 * 【Kotlin 语法：泛型 Lambda 参数】
 * 与 [SourceDatabase.read] 相同的 Loan Pattern，但 transaction 方法额外保证：
 * - block 正常返回时自动 commit；
 * - block 抛出异常时自动 rollback。
 *
 * 【继承 AutoCloseable】
 * 与 [SourceDatabase] 相同，持有 HikariCP 连接池等需要显式释放的资源。
 *
 * 【与其他模块的连接】
 * - 由 [MigrationDatabaseFactory.openTarget] 创建；
 * - 被 MigrationTask 实现类调用，写入 V2 数据；
 * - 被 checkpoint/error/run 仓储调用，记录迁移元数据；
 * - 与 [SourceDatabase] 对称：Source 只读，Target 读写。
 */
interface TargetDatabase : AutoCloseable {
    /**
     * 在目标库的 DSLContext 上执行只读查询。
     *
     * 实现保证：
     * - 连接为 autoCommit=false，但不开启显式事务；
     * - block 执行完毕后连接自动归还连接池。
     *
     * @param block 使用 DSLContext 执行查询的 Lambda
     * @return block 的返回值
     */
    fun <T> read(block: (DSLContext) -> T): T

    /**
     * 在目标库的 DSLContext 上执行事务操作。
     *
     * 实现保证：
     * - block 正常返回时自动 commit；
     * - block 抛出异常时自动 rollback；
     * - rollback 失败时将异常作为 suppressed exception 附加到原始异常上。
     *
     * 【重要】checkpoint 仓储的 save 方法接收的 DSLContext 参数必须来自此事务，
     * 以保证业务数据和 checkpoint 的原子性。
     *
     * @param block 使用 DSLContext 执行事务操作的 Lambda
     * @return block 的返回值
     */
    fun <T> transaction(block: (DSLContext) -> T): T
}
