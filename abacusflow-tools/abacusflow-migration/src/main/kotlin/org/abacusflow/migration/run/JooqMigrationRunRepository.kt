package org.abacusflow.migration.run

import org.abacusflow.migration.database.TargetDatabase
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import org.jooq.impl.DSL
import java.time.Instant
import java.util.UUID

/**
 * [MigrationRunRepository] 的 jOOQ 实现，使用独立短事务记录运行状态。
 *
 * 【设计目的与系统角色】
 * 本类是运行状态仓储的 jOOQ 适配器，负责将迁移运行的生命周期事件
 * 持久化到目标库控制 schema 中的 migration_run 和 migration_task_run 两张表。
 *
 * 【关键设计：使用独立短事务】
 * 与 [org.abacusflow.migration.error.JooqMigrationErrorRepository] 相同，
 * 本类通过 [TargetDatabase.transaction] 自行开启独立事务，原因：
 * - 运行状态（尤其是 FAILED）必须在业务回滚后仍然可见；
 * - 如果运行状态共享业务事务，业务回滚会导致 FAILED 状态也回滚，
 *   重启后引擎会误认为上次运行仍在 RUNNING 状态；
 * - 运行状态的写入不应影响业务批次的事务边界。
 *
 * 【双表设计】
 * 本类操作两张控制表：
 * 1. migration_run：运行级别的记录，一次迁移运行一行；
 * 2. migration_task_run：任务级别的记录，每个任务一行，通过 run_id 关联到运行记录。
 * 两张表是一对多关系：一次运行包含多个任务执行记录。
 *
 * 【控制表 DDL 参考】
 * migration_run 表结构：
 *   run_id          UUID NOT NULL        -- 运行唯一标识（主键）
 *   status          TEXT NOT NULL        -- 运行状态（RUNNING/SUCCEEDED/FAILED）
 *   selected_tasks  JSONB NOT NULL       -- 选中的任务列表（JSON 数组格式）
 *   started_at      TIMESTAMPTZ NOT NULL -- 开始时间
 *   finished_at     TIMESTAMPTZ          -- 结束时间（可为 null）
 *   message         TEXT                 -- 结束消息（可为 null）
 *
 * migration_task_run 表结构：
 *   run_id          UUID NOT NULL        -- 关联的运行 ID
 *   task_name       TEXT NOT NULL        -- 任务名称
 *   status          TEXT NOT NULL        -- 任务状态（RUNNING/SUCCEEDED/FAILED）
 *   processed_count BIGINT               -- 已处理记录数
 *   skipped_count   BIGINT               -- 跳过记录数
 *   error_count     BIGINT               -- 错误记录数
 *   started_at      TIMESTAMPTZ NOT NULL -- 开始时间
 *   finished_at     TIMESTAMPTZ          -- 结束时间
 *   PRIMARY KEY (run_id, task_name)      -- 复合主键
 *
 * 【jOOQ 动态 SQL 模式】
 * 与其他 jOOQ 仓储实现相同，使用 DSL.table/DSL.name/DSL.field 构建动态 SQL，
 * 不依赖代码生成器。详见 [JooqMigrationCheckpointRepository] 的注释。
 *
 * @param target        目标库实例，用于开启独立事务
 * @param controlSchema 控制表所在的 schema 名称，默认 "abacusflow_migration"
 */
class JooqMigrationRunRepository(
    private val target: TargetDatabase,
    private val controlSchema: String = "abacusflow_migration",
) : MigrationRunRepository {
    /**
     * 运行控制表的 jOOQ Table 对象。
     */
    private val runTable = DSL.table(DSL.name(controlSchema, "migration_run"))

    /**
     * 任务执行控制表的 jOOQ Table 对象。
     */
    private val taskRunTable = DSL.table(DSL.name(controlSchema, "migration_task_run"))

    /**
     * 记录迁移运行开始，创建运行记录。
     *
     * 【jOOQ 动态 SQL 模式：INSERT INTO ... VALUES ...】
     *
     * 生成的 SQL 等价于：
     *   INSERT INTO abacusflow_migration.migration_run
     *     (run_id, status, selected_tasks, started_at)
     *   VALUES (?, ?, ?, ?)
     *
     * 【Kotlin 语法：.map {}.let {} 链式调用】
     * `run.selectedTasks.map { it.cliName }.let { names -> ... }` 是 Kotlin 的链式作用域函数：
     * 1. `.map { it.cliName }`：将 MigrationTaskId 集合转换为字符串名称集合；
     *    `it` 是 Lambda 的隐式参数，指代集合中的每个元素；
     * 2. `.let { names -> ... }`：将 map 的结果作为参数传给 let 的 Lambda，
     *    `names` 是显式命名的参数，指代字符串名称集合；
     *    let 返回 Lambda 的结果（即格式化后的 JSON 字符串）。
     *
     * 【selected_tasks 的 JSON 格式】
     * selected_tasks 字段存储为 JSON 数组格式，如：
     *   ["product","inventory","partner"]
     * 使用手动拼接而非 JSON 库，因为格式简单且无需复杂序列化。
     * 格式：`["name1","name2","name3"]`
     *
     * @param run 运行记录（状态应为 RUNNING）
     */
    override fun start(run: MigrationRun) {
        target.transaction { dsl ->
            dsl.insertInto(runTable)
                .columns(
                    DSL.field("run_id"),
                    DSL.field("status"),
                    DSL.field("selected_tasks"),
                    DSL.field("started_at"),
                ).values(
                    run.runId,
                    run.status.name,
                    run.selectedTasks.map { it.cliName }.let { names ->
                        "[" + names.joinToString(",") { "\"$it\"" } + "]"
                    },
                    run.startedAt,
                ).execute()
        }
    }

    /**
     * 记录某个任务开始执行，创建任务执行记录。
     *
     * 【jOOQ 动态 SQL 模式：INSERT INTO ... VALUES ...】
     *
     * 生成的 SQL 等价于：
     *   INSERT INTO abacusflow_migration.migration_task_run
     *     (run_id, task_name, status, started_at)
     *   VALUES (?, ?, 'RUNNING', ?)
     *
     * 【Kotlin 语法：enum.name 属性】
     * `MigrationRunStatus.RUNNING.name` 获取枚举值的字符串名称（"RUNNING"），
     * 这是 Kotlin/Java 枚举的内置属性，与 toString() 类似但不会被子类覆盖。
     *
     * @param runId   运行 ID
     * @param taskId  任务标识
     */
    override fun taskStarted(
        runId: UUID,
        taskId: MigrationTaskId,
    ) {
        target.transaction { dsl ->
            dsl.insertInto(taskRunTable)
                .columns(
                    DSL.field("run_id"),
                    DSL.field("task_name"),
                    DSL.field("status"),
                    DSL.field("started_at"),
                ).values(
                    runId,
                    taskId.cliName,
                    MigrationRunStatus.RUNNING.name,
                    Instant.now(),
                ).execute()
        }
    }

    /**
     * 记录某个任务执行完成，更新任务执行记录的统计信息。
     *
     * 【jOOQ 动态 SQL 模式：UPDATE ... SET ... WHERE ... AND ...】
     *
     * 生成的 SQL 等价于：
     *   UPDATE abacusflow_migration.migration_task_run
     *   SET status = 'SUCCEEDED',
     *       processed_count = ?,
     *       skipped_count = ?,
     *       error_count = ?,
     *       finished_at = ?
     *   WHERE run_id = ? AND task_name = ?
     *
     * 步骤解析：
     * 1. dsl.update(table) — 指定要更新的表；
     * 2. .set(field, value) — 设置各列的新值，jOOQ 自动参数绑定；
     * 3. .where(field.eq(value)) — 指定 WHERE 条件（run_id 匹配）；
     * 4. .and(field.eq(value)) — 追加 AND 条件（task_name 匹配）；
     * 5. .execute() — 执行 UPDATE 语句。
     *
     * 【设计选择：使用复合条件定位记录】
     * WHERE run_id = ? AND task_name = ? 使用复合条件而非单一主键，
     * 因为 migration_task_run 的主键是 (run_id, task_name) 复合主键。
     *
     * @param runId   运行 ID
     * @param result  任务执行结果（包含 taskId、processedCount、skippedCount、errorCount）
     */
    override fun taskCompleted(
        runId: UUID,
        result: TaskResult,
    ) {
        target.transaction { dsl ->
            dsl.update(taskRunTable)
                .set(DSL.field("status"), MigrationRunStatus.SUCCEEDED.name)
                .set(DSL.field("processed_count"), result.processedCount)
                .set(DSL.field("skipped_count"), result.skippedCount)
                .set(DSL.field("error_count"), result.errorCount)
                .set(DSL.field("finished_at"), Instant.now())
                .where(DSL.field("run_id").eq(runId))
                .and(DSL.field("task_name").eq(result.taskId.cliName))
                .execute()
        }
    }

    /**
     * 记录迁移运行结束，更新运行记录的最终状态。
     *
     * 【jOOQ 动态 SQL 模式：条件性 UPDATE SET】
     *
     * 生成的 SQL 等价于（有 message 时）：
     *   UPDATE abacusflow_migration.migration_run
     *   SET status = ?, finished_at = ?, message = ?
     *   WHERE run_id = ?
     *
     * 或（无 message 时）：
     *   UPDATE abacusflow_migration.migration_run
     *   SET status = ?, finished_at = ?
     *   WHERE run_id = ?
     *
     * 【设计选择：条件性设置 message 字段】
     * message 字段在数据库中可为 null，只在有值时才设置。
     * 使用 `if (message != null) update.set(...)` 而非无条件设置，
     * 避免将 null 写入已有 message 值的记录（虽然实际场景中 finish 只调用一次）。
     *
     * 【Kotlin 语法：变量赋值与链式调用】
     * `val update = dsl.update(runTable).set(...).set(...)` 将链式调用的中间结果
     * 赋值给变量 update，然后根据条件决定是否追加 .set() 调用。
     * jOOQ 的 UpdateSetStep.set() 返回 UpdateSetMoreStep，可以继续链式调用。
     * 这种"先构建基础更新，再条件性追加"的模式在 jOOQ 动态 SQL 中很常见。
     *
     * @param runId       运行 ID
     * @param status      最终状态（SUCCEEDED 或 FAILED）
     * @param finishedAt  结束时间
     * @param message     可选的结束消息（如失败原因描述）
     */
    override fun finish(
        runId: UUID,
        status: MigrationRunStatus,
        finishedAt: Instant,
        message: String?,
    ) {
        target.transaction { dsl ->
            val update =
                dsl.update(runTable)
                    .set(DSL.field("status"), status.name)
                    .set(DSL.field("finished_at"), finishedAt)
            if (message != null) {
                update.set(DSL.field("message"), message)
            }
            update.where(DSL.field("run_id").eq(runId))
                .execute()
        }
    }
}
