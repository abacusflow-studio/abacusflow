package org.abacusflow.migration.checkpoint

import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.time.Instant
import java.util.UUID

/**
 * [MigrationCheckpointRepository] 的 jOOQ 实现，使用动态 SQL 操作控制表。
 *
 * 【设计目的与系统角色】
 * 本类是断点仓储的 jOOQ 适配器，负责将 [MigrationCheckpoint] 领域对象
 * 持久化到目标库的控制 schema 中的 migration_checkpoint 表。
 * 它是迁移引擎实现"可恢复性"的基础设施。
 *
 * 【设计选择：使用 jOOQ 动态 SQL 而非代码生成】
 * 迁移工具不使用 jOOQ 的代码生成器（gradle jooq-codegen），原因：
 * 1. 迁移工具操作的是控制表（abacusflow_migration schema），这些表由迁移工具自身管理，
 *    不属于 V2 业务域，没有对应的 jOOQ 生成代码；
 * 2. 使用动态 SQL（DSL.table/DSL.field/DSL.name）更灵活，不依赖代码生成步骤；
 * 3. 迁移工具是独立模块，不应依赖 V2 的 jOOQ 生成代码。
 *
 * 【jOOQ 动态 SQL 模式详解】
 *
 * 1. DSL.table(DSL.name(controlSchema, "migration_checkpoint"))
 *    - DSL.name(schema, table) 创建限定名（qualified name），
 *      生成 SQL 时会输出 `abacusflow_migration.migration_checkpoint`；
 *    - DSL.table() 将名称包装为 Table 对象，可用于 FROM/INSERT INTO 等子句；
 *    - 这等价于代码生成器生成的 `AbacusflowMigration.MIGRATION_CHECKPOINT`，
 *      但无需代码生成步骤。
 *
 * 2. DSL.field("cursor", String::class.java)
 *    - 创建一个带名称和类型的 Field 对象，用于 SELECT/INSERT/UPDATE 等子句；
 *    - 第二个参数指定 Java 类型，jOOQ 会据此进行类型转换；
 *    - 这等价于代码生成器生成的 `MIGRATION_CHECKPOINT.CURSOR`，
 *      但无需代码生成步骤。
 *
 * 3. DSL.field("task_name").eq(taskName)
 *    - 创建一个比较条件（Condition），生成 SQL 时输出 `task_name = ?`；
 *    - jOOQ 会自动使用 PreparedStatement 参数绑定，防止 SQL 注入。
 *
 * 【控制表 DDL 参考】
 * migration_checkpoint 表结构（位于 controlSchema 指定的 schema 中）：
 *   task_name              TEXT NOT NULL        -- 任务名称（MigrationTaskId.cliName）
 *   stream                 TEXT NOT NULL        -- 子流名称
 *   cursor                 TEXT                 -- 游标值（可为 null）
 *   processed_count        BIGINT NOT NULL      -- 已处理记录数
 *   run_id                 UUID NOT NULL        -- 关联的迁移运行 ID
 *   implementation_version INTEGER NOT NULL     -- 实现版本号
 *   updated_at             TIMESTAMPTZ NOT NULL -- 最后更新时间
 *   PRIMARY KEY (task_name, stream)             -- 复合主键
 *
 * @param controlSchema 控制表所在的 schema 名称，默认 "abacusflow_migration"
 */
class JooqMigrationCheckpointRepository(
    private val controlSchema: String = "abacusflow_migration",
) : MigrationCheckpointRepository {
    /**
     * 控制表的 jOOQ Table 对象，使用限定名引用。
     *
     * 【jOOQ 动态 SQL：DSL.table + DSL.name】
     * - DSL.name("abacusflow_migration", "migration_checkpoint") 创建限定名，
     *   生成 SQL 时输出 `abacusflow_migration.migration_checkpoint`；
     * - DSL.table() 将其包装为 Table 对象，可用于 from()、insertInto() 等方法。
     * - 将 table 缓存为类属性，避免每次方法调用时重复创建。
     */
    private val table = DSL.table(DSL.name(controlSchema, "migration_checkpoint"))

    /**
     * 查找指定任务流的断点记录。
     *
     * 【jOOQ 动态 SQL 模式：SELECT ... FROM ... WHERE ... .fetchOne {}】
     *
     * 生成的 SQL 等价于：
     *   SELECT cursor, processed_count, run_id, implementation_version, updated_at
     *   FROM abacusflow_migration.migration_checkpoint
     *   WHERE task_name = ? AND stream = ?
     *
     * 步骤解析：
     * 1. dsl.select(field1, field2, ...) — 指定要查询的列，每列带类型信息；
     * 2. .from(table) — 指定查询的表；
     * 3. .where(field.eq(value)) — 添加 WHERE 条件，jOOQ 自动参数绑定；
     * 4. .and(field.eq(value)) — 追加 AND 条件（等价于 .where(cond1.and(cond2))）；
     * 5. .fetchOne { record -> ... } — 执行查询并映射结果：
     *    - 返回 null 如果没有匹配行（对应接口的 MigrationCheckpoint? 返回类型）；
     *    - record.value1() 到 value5() 按声明顺序获取各列值，
     *      类型由 select 中的 Field 类型参数决定。
     *
     * 【Kotlin 语法：Lambda 作为 fetchOne 的参数】
     * fetchOne 接收一个 RecordMapper Lambda，将 jOOQ 的 Record 映射为领域对象。
     * 这是 Kotlin + jOOQ 的惯用写法，比 Java 的显式 RecordMapper 更简洁。
     *
     * @param dsl  DSLContext（可能是事务内的，保证读一致性）
     * @param key  要查找的断点复合键
     * @return 断点记录，不存在则返回 null
     */
    override fun find(
        dsl: DSLContext,
        key: CheckpointKey,
    ): MigrationCheckpoint? {
        // 从 CheckpointKey 提取任务名称（MigrationTaskId.cliName 是任务的字符串标识）
        val taskName = key.taskId.cliName
        return dsl.select(
            DSL.field("cursor", String::class.java),
            DSL.field("processed_count", Long::class.java),
            DSL.field("run_id", UUID::class.java),
            DSL.field("implementation_version", Int::class.java),
            DSL.field("updated_at", Instant::class.java),
        ).from(table)
            .where(DSL.field("task_name").eq(taskName))
            .and(DSL.field("stream").eq(key.stream))
            .fetchOne { record ->
                MigrationCheckpoint(
                    key = key,
                    cursor = record.value1(),
                    processedCount = record.value2(),
                    runId = record.value3(),
                    implementationVersion = record.value4(),
                    updatedAt = record.value5(),
                )
            }
    }

    /**
     * 保存断点记录（插入或更新）。
     *
     * 【jOOQ 动态 SQL 模式：INSERT ... ON CONFLICT ... DO UPDATE（UPSERT）】
     *
     * 生成的 SQL 等价于：
     *   INSERT INTO abacusflow_migration.migration_checkpoint
     *     (task_name, stream, cursor, processed_count, run_id, implementation_version, updated_at)
     *   VALUES (?, ?, ?, ?, ?, ?, ?)
     *   ON CONFLICT (task_name, stream)
     *   DO UPDATE SET
     *     cursor = excluded.cursor,
     *     processed_count = excluded.processed_count,
     *     run_id = excluded.run_id,
     *     implementation_version = excluded.implementation_version,
     *     updated_at = excluded.updated_at
     *
     * 步骤解析：
     * 1. insertInto(table) — 指定目标表；
     * 2. .columns(field1, field2, ...) — 指定要插入的列；
     * 3. .values(val1, val2, ...) — 指定对应的值，jOOQ 自动参数绑定；
     * 4. .onConflict(field1, field2) — 指定冲突检测的列（对应主键或唯一约束）；
     * 5. .doUpdate() — 冲突时执行更新而非报错；
     * 6. .set(field, value) — 设置更新值，excluded 前缀引用 INSERT 中的新值
     *    （jOOQ 自动处理 excluded 引用，这里直接用 checkpoint 对象的值）；
     * 7. .execute() — 执行 SQL 语句。
     *
     * 【为什么使用 UPSERT 而非先查后写？】
     * - 避免竞态条件：并发场景下"先查后写"可能导致重复插入或丢失更新；
     * - 性能更好：一次数据库往返完成插入或更新，而非两次（SELECT + INSERT/UPDATE）；
     * - 原子性：UPSERT 是单条 SQL 语句，在事务内是原子的。
     *
     * 【重要：transaction 参数必须来自业务批次的事务】
     * 此方法不创建自己的事务，而是使用调用方传入的 transaction DSLContext。
     * 这保证了断点更新和业务数据写入在同一个事务内，要么一起提交，要么一起回滚。
     *
     * @param transaction  业务批次的事务 DSLContext
     * @param checkpoint   要保存的断点记录
     */
    override fun save(
        transaction: DSLContext,
        checkpoint: MigrationCheckpoint,
    ) {
        val taskName = checkpoint.key.taskId.cliName
        transaction.insertInto(table)
            .columns(
                DSL.field("task_name"),
                DSL.field("stream"),
                DSL.field("cursor"),
                DSL.field("processed_count"),
                DSL.field("run_id"),
                DSL.field("implementation_version"),
                DSL.field("updated_at"),
            ).values(
                taskName,
                checkpoint.key.stream,
                checkpoint.cursor,
                checkpoint.processedCount,
                checkpoint.runId,
                checkpoint.implementationVersion,
                checkpoint.updatedAt,
            ).onConflict(DSL.field("task_name"), DSL.field("stream"))
            .doUpdate()
            .set(DSL.field("cursor"), checkpoint.cursor)
            .set(DSL.field("processed_count"), checkpoint.processedCount)
            .set(DSL.field("run_id"), checkpoint.runId)
            .set(DSL.field("implementation_version"), checkpoint.implementationVersion)
            .set(DSL.field("updated_at"), checkpoint.updatedAt)
            .execute()
    }
}
