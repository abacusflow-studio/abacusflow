package org.abacusflow.migration.error

import org.abacusflow.migration.database.TargetDatabase
import org.jooq.impl.DSL

/**
 * [MigrationErrorRepository] 的 jOOQ 实现，使用独立短事务记录错误。
 *
 * 【设计目的与系统角色】
 * 本类是错误记录仓储的 jOOQ 适配器，负责将 [MigrationError] 领域对象
 * 持久化到目标库的控制 schema 中的 migration_error 表。
 * 错误记录是迁移过程的"黑匣子"，即使业务批次失败回滚，错误信息也必须保留。
 *
 * 【关键设计：使用独立短事务，不与业务批次共享】
 * 与 [org.abacusflow.migration.checkpoint.JooqMigrationCheckpointRepository] 不同，
 * 本类通过 [TargetDatabase.transaction] 自行开启独立事务，原因：
 *
 * 1. 错误记录是"观测数据"，不应随业务批次回滚而丢失：
 *    - 如果业务批次写入失败需要回滚，错误记录仍需保留以便事后分析失败原因；
 *    - 否则回滚后错误信息也消失了，无法诊断问题。
 *
 * 2. 错误记录的写入不应影响业务批次的事务边界：
 *    - 如果错误记录共享业务事务，其写入失败也会导致业务回滚；
 *    - 但错误记录写入失败（如表空间满）不应阻止业务流程继续尝试。
 *
 * 3. 运行状态（FAILED）也必须在业务回滚后仍然可见：
 *    - [org.abacusflow.migration.run.JooqMigrationRunRepository] 同样使用独立事务。
 *
 * 三种仓储的事务策略对比：
 * | 仓储       | 事务策略           | 原因                                      |
 * |-----------|-------------------|-------------------------------------------|
 * | checkpoint | 共享业务事务        | 断点和业务数据必须原子提交，否则数据不一致    |
 * | error      | 独立短事务          | 错误记录是观测数据，不应随业务回滚而丢失      |
 * | run        | 独立短事务          | 运行状态（FAILED）必须在业务回滚后仍可见      |
 *
 * 【jOOQ 动态 SQL 模式详解】
 * 与 [JooqMigrationCheckpointRepository] 使用相同的动态 SQL 模式：
 * - DSL.table(DSL.name(controlSchema, "migration_error"))：创建限定名表引用；
 * - DSL.field("column_name")：创建字段引用，用于 INSERT 语句。
 *
 * 【控制表 DDL 参考】
 * migration_error 表结构（位于 controlSchema 指定的 schema 中）：
 *   run_id        UUID NOT NULL        -- 关联的迁移运行 ID
 *   task_name     TEXT NOT NULL        -- 任务名称（MigrationTaskId.cliName）
 *   stream        TEXT NOT NULL        -- 子流名称
 *   record_key    TEXT NOT NULL        -- 出错记录的标识键（最多 500 字符）
 *   message       TEXT NOT NULL        -- 错误消息（最多 2000 字符）
 *   retryable     BOOLEAN NOT NULL     -- 是否可重试
 *   created_at    TIMESTAMPTZ NOT NULL -- 创建时间
 *
 * 【安全考量】
 * - recordKey 使用 .take(500) 截断到 500 字符，防止超长键值导致写入失败；
 * - message 使用 .take(2000) 截断到 2000 字符，防止超长错误消息导致写入失败；
 * - 不记录敏感数据（密码、完整个人数据等）。
 *
 * @param target        目标库实例，用于开启独立事务
 * @param controlSchema 控制表所在的 schema 名称，默认 "abacusflow_migration"
 */
class JooqMigrationErrorRepository(
    private val target: TargetDatabase,
    private val controlSchema: String = "abacusflow_migration",
) : MigrationErrorRepository {
    /**
     * 错误控制表的 jOOQ Table 对象，使用限定名引用。
     *
     * 【jOOQ 动态 SQL：DSL.table + DSL.name】
     * 与 checkpoint 仓储相同，使用 DSL.name 创建限定名，DSL.table 包装为 Table 对象。
     * 缓存为类属性，避免每次 record 调用时重复创建。
     */
    private val table = DSL.table(DSL.name(controlSchema, "migration_error"))

    /**
     * 记录一条迁移错误，使用独立短事务写入。
     *
     * 【jOOQ 动态 SQL 模式：INSERT INTO ... VALUES ...】
     *
     * 生成的 SQL 等价于：
     *   INSERT INTO abacusflow_migration.migration_error
     *     (run_id, task_name, stream, record_key, message, retryable, created_at)
     *   VALUES (?, ?, ?, ?, ?, ?, ?)
     *
     * 步骤解析：
     * 1. target.transaction { dsl -> ... } — 开启独立短事务，保证错误记录不随业务回滚；
     * 2. dsl.insertInto(table) — 指定目标表；
     * 3. .columns(field1, field2, ...) — 指定要插入的列；
     * 4. .values(val1, val2, ...) — 指定对应的值，jOOQ 自动参数绑定防止 SQL 注入；
     * 5. .execute() — 执行 SQL 语句；
     * 6. transaction 正常完成时自动 commit。
     *
     * 【Kotlin 语法：String.take(n)】
     * `error.recordKey.take(500)` 是 Kotlin 标准库的扩展函数，
     * 返回字符串的前 500 个字符。如果字符串长度不足 500，返回原字符串。
     * 这比 Java 的 substring 更安全——不会抛出 IndexOutOfBoundsException。
     * 用于截断可能超长的输入，防止数据库字段溢出导致写入失败。
     *
     * 【Kotlin 语法：.let 与 作用域函数链】
     * 无额外 let 链，直接在 values() 中调用 .take()。
     *
     * @param error 要记录的迁移错误
     */
    override fun record(error: MigrationError) {
        target.transaction { dsl ->
            dsl.insertInto(table)
                .columns(
                    DSL.field("run_id"),
                    DSL.field("task_name"),
                    DSL.field("stream"),
                    DSL.field("record_key"),
                    DSL.field("message"),
                    DSL.field("retryable"),
                    DSL.field("created_at"),
                ).values(
                    error.runId,
                    error.taskId.cliName,
                    error.stream,
                    error.recordKey.take(500),
                    error.message.take(2000),
                    error.retryable,
                    error.createdAt,
                ).execute()
        }
    }
}
