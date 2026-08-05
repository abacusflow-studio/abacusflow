package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import org.jooq.impl.DSL

/**
 * 最终化任务：为所有保留原 ID 的 identity/sequence 对齐 next value，
 * 刷新统计信息，并生成迁移摘要报告。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线的"第五层：收尾"环节，也是整个迁移流程的最后一个任务。
 * 它不迁移任何业务数据，而是在所有业务数据迁移完成后执行收尾操作：
 * 1. 对齐 identity/sequence 的 next value：V2 数据库中如果保留了 V1 的原始 ID，
 *    需要将自增序列的当前值推进到已写入的最大 ID 之后，避免后续插入时 ID 冲突
 * 2. 刷新统计信息：更新物化视图、统计表等派生数据，确保查询结果与实际数据一致
 * 3. 生成迁移摘要报告：汇总本次迁移的统计信息（各任务处理记录数、失败数等），
 *    供运维人员审核
 * 4. 校验通过后才允许标记整次 run 完成：如果校验失败，run 状态保持为"未完成"，
 *    需要人工介入排查
 *
 * 【V1→V2 映射要点】
 * 本任务不涉及 V1→V2 的数据映射，但需要关注：
 * 1. identity/sequence 对齐：V1 中各表的自增 ID 最大值可能与 V2 的 sequence 当前值
 *    不一致，需要逐表对齐，否则后续 INSERT 可能因主键冲突而失败
 * 2. 统计信息刷新：V2 中可能存在依赖触发器或物化视图的统计字段，
 *    迁移过程中绕过了这些机制（直接 INSERT），需要在收尾时手动刷新
 * 3. 具体涉及的 DDL 操作（如 ALTER SEQUENCE、REFRESH MATERIALIZED VIEW）
 *    需由数据库负责人审核，不能自动执行未经审核的 DDL
 *
 * 【与其他组件的连接】
 * - 依赖 SALE_ORDER_ITEM 任务：代表交易层（第四层）已全部完成，
 *   与 PURCHASE_ORDER_ITEM 一起覆盖所有业务数据的间接依赖链
 * - 被依赖：无——本任务是迁移管线的最后一个任务
 * - MigrationRunner：在所有前置任务成功后调用本任务的 execute，
 *   本任务返回成功后，MigrationRunner 标记整次 run 为"完成"
 * - ANALYZE 参数：可选的数据库 ANALYZE 操作（更新查询优化器统计信息），
 *   **不是默认行为**，需要显式启用，因为在大表上执行 ANALYZE 可能耗时较长
 *
 * 【Kotlin 语法要点】
 * - class : PlannedMigrationTask(...)：Kotlin 的类继承与主构造函数委托，
 *   冒号后跟基类并直接在括号中传递构造参数，等价于 Java 的 super(id, deps)
 * - setOf(MigrationTaskId.ROLE_PERMISSION, MigrationTaskId.SALE_ORDER_ITEM)：
 *   创建包含两个元素的不可变 Set，表示本任务依赖授权层和交易层都已完成。
 *   ROLE_PERMISSION 覆盖了基础实体层+授权层的间接依赖链，
 *   SALE_ORDER_ITEM 覆盖了业务实体层+交易层的间接依赖链，
 *   两者合起来确保所有前置业务任务都已完成
 * - MigrationTaskId.FINALIZE：枚举值，作为任务的唯一标识符，
 *   会被持久化到 checkpoint/error 表中
 */
class FinalizeMigration :
    PlannedMigrationTask(
        /** 任务唯一标识符，对应 MigrationTaskId.FINALIZE，持久化到检查点和错误记录中。 */
        MigrationTaskId.FINALIZE,
        /**
         * 前置依赖集合：ROLE_PERMISSION（授权层完成）和 SALE_ORDER_ITEM（交易层完成）。
         * 两者合起来覆盖了所有前置业务任务的间接依赖链，
         * 确保收尾操作在所有业务数据迁移完成后才执行。
         */
        setOf(
            MigrationTaskId.PURCHASE_ORDER_ITEM,
            MigrationTaskId.SALE_ORDER_ITEM,
        ),
    ) {
    override fun execute(context: MigrationContext): TaskResult {
        var sequenceCount = 0L
        context.target.transaction { dsl ->
            setTenantContext(dsl, context.options.defaultTenant.id)
            val currentSchema = dsl.fetchValue("SELECT current_schema()") as String? ?: "public"
            val tableName = DSL.field("table_name", String::class.java)
            val tables =
                dsl.select(tableName)
                    .from(DSL.table(DSL.name("information_schema", "columns")))
                    .where(DSL.field("table_schema").eq(currentSchema))
                    .and(DSL.field("column_name").eq("id"))
                    .and(DSL.field("is_identity").eq("YES"))
                    .fetch(tableName)
            tables.forEach { table ->
                val renderedTable = dsl.render(DSL.name(table))
                val sequence =
                    requireNotNull(
                        dsl.fetchValue(
                            "SELECT pg_get_serial_sequence(?, 'id')",
                            table,
                        ) as String?,
                    ) { "Cannot resolve identity sequence for $table.id" }
                val maxId =
                    requireNotNull(
                        dsl.fetchValue("SELECT COALESCE(MAX(id), 0) FROM $renderedTable") as Number?,
                    ).toLong()
                val nextId = maxOf(maxId + 1, 100L)
                dsl.execute(
                    "SELECT setval(CAST(? AS regclass), ?, FALSE)",
                    sequence,
                    nextId,
                )
                sequenceCount++
            }
        }
        return TaskResult(taskId = id, processedCount = sequenceCount)
    }
}
