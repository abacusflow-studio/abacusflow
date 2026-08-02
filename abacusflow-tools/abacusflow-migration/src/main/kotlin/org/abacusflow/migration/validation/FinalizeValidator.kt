package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.migration.setTenantContext
import org.jooq.impl.DSL
import java.time.Duration
import java.time.Instant

/**
 * 收尾校验器 —— 校验迁移收尾阶段的数据一致性。
 *
 * 【设计目的与迁移管线中的角色】
 * FinalizeValidator 是迁移校验管线的最后一个校验器，负责验证
 * 收尾任务（FinalizeMigration）的结果是否正确。收尾任务在所有
 * 数据迁移完成后执行，负责数据一致性校验和清理工作。
 * FinalizeValidator 是"校验的校验"——它不仅校验收尾任务本身的结果，
 * 还从全局视角汇总所有任务的校验结果，提供最终的迁移质量判定。
 *
 * 【校验内容】
 * 本校验器需要验证以下两个方面：
 * 1. **所有 identity sequence 的下一值大于当前最大 ID**：
 *    V2 数据库使用序列（sequence）生成新记录的 ID。迁移过程中，
 *    数据是直接插入的（使用 V1 的原始 ID），不会通过序列生成。
 *    因此迁移完成后，序列的当前值（next value）可能小于已插入的
 *    最大 ID，导致后续新建记录时 ID 冲突。收尾任务需要将所有
 *    序列的 next value 调整为大于当前最大 ID 的值。
 *    本校验器验证这一调整是否成功：
 *    - 对每张迁移过的表，查询当前最大 ID
 *    - 对每个对应的序列，查询 next value
 *    - 确认 next value > 当前最大 ID
 *    如果不满足，后续新建记录会产生主键冲突，导致系统无法正常使用。
 * 2. **汇总所有任务结果**：
 *    FinalizeValidator 作为最后一个校验器，还承担着"汇总报告"的职责：
 *    - 收集所有前置校验器的 ValidationResult
 *    - 汇总为 ValidationReport
 *    - 提供整体通过/失败判定
 *    这使得运维人员只需查看 FinalizeValidator 的结果，
 *    就能快速判断整个迁移是否成功。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：FinalizeMigration（taskId = MigrationTaskId.FINALIZE）
 * - 依赖校验器：所有前置校验器（收尾在所有校验之后执行）
 * - 在 StandardValidationPlan 中最后一个注册
 * - ValidationReport 由本校验器或校验 Runner 构建
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.FINALIZE：将校验器与收尾迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class FinalizeValidator : MigrationValidator {
    override val taskId: MigrationTaskId = MigrationTaskId.FINALIZE

    override fun validate(context: MigrationContext): ValidationResult {
        val startedAt = Instant.now(context.clock)
        val violations = mutableListOf<String>()
        var checked = 0
        context.target.read { dsl ->
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
                val sequence = dsl.fetchValue("SELECT pg_get_serial_sequence(?, 'id')", table) as String?
                if (sequence == null) {
                    violations += "$table.id has no identity sequence"
                } else {
                    val maxId =
                        requireNotNull(
                            dsl.fetchValue("SELECT COALESCE(MAX(id), 0) FROM $renderedTable") as Number?,
                        ).toLong()
                    val lastValue =
                        requireNotNull(
                            dsl.fetchValue(
                                "SELECT last_value FROM ${dsl.render(DSL.name(*sequence.split('.').toTypedArray()))}",
                            ) as Number?,
                        ).toLong()
                    if (lastValue < maxOf(maxId + 1, 100L)) {
                        violations += "$sequence last_value=$lastValue is behind max($table.id)=$maxId"
                    }
                }
                checked++
            }
        }
        return ValidationResult(
            taskId = taskId,
            passed = violations.isEmpty(),
            metrics = mapOf("identity-sequences-checked" to checked.toString()),
            violations = violations,
            duration = Duration.between(startedAt, Instant.now(context.clock)),
        )
    }
}
