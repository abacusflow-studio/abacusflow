package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.migration.setTenantContext
import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.math.BigDecimal
import java.time.Duration
import java.time.Instant

data class TableValidationSpec(
    val sourceTable: String,
    val targetTable: String = sourceTable,
    val tenantAware: Boolean = true,
    val targetMayContainSeedRows: Boolean = false,
    val comparePreservedIds: Boolean = true,
    /** 指标名到受信任 SQL 表达式；两端分别执行 SUM 后做精确数值比较。 */
    val aggregateExpressions: Map<String, String> = emptyMap(),
)

/** 通用的表级完整性校验：数量，以及保留主键表的 count/sum/min/max 摘要。 */
abstract class TableCountValidator(
    final override val taskId: MigrationTaskId,
    private val specs: List<TableValidationSpec>,
) : MigrationValidator {
    override fun validate(context: MigrationContext): ValidationResult {
        val startedAt = Instant.now(context.clock)
        val metrics = linkedMapOf<String, String>()
        val violations = mutableListOf<String>()

        specs.forEach { spec ->
            val source = context.source.read { dsl -> stats(dsl, spec.sourceTable, spec.comparePreservedIds) }
            val target =
                context.target.read { dsl ->
                    if (spec.tenantAware) setTenantContext(dsl, context.options.defaultTenant.id)
                    stats(
                        dsl = dsl,
                        table = spec.targetTable,
                        includeIds = spec.comparePreservedIds,
                        tenantId = context.options.defaultTenant.id.takeIf { spec.tenantAware },
                    )
                }
            val key = spec.sourceTable.replace('_', '-')
            metrics["$key.source-count"] = source.count.toString()
            metrics["$key.target-count"] = target.count.toString()

            val countMatches =
                if (spec.targetMayContainSeedRows) {
                    target.count >= source.count
                } else {
                    target.count == source.count
                }
            if (!countMatches) {
                val operator = if (spec.targetMayContainSeedRows) ">=" else "="
                violations +=
                    "${spec.targetTable}: expected target count $operator ${source.count}, actual ${target.count}"
            }
            if (spec.comparePreservedIds && !spec.targetMayContainSeedRows && source != target) {
                violations +=
                    "${spec.targetTable}: preserved ID summary differs " +
                    "(source=$source, target=$target)"
            }
            val sourceAggregates =
                context.source.read { dsl -> aggregates(dsl, spec.sourceTable, spec.aggregateExpressions) }
            val targetAggregates =
                context.target.read { dsl ->
                    if (spec.tenantAware) setTenantContext(dsl, context.options.defaultTenant.id)
                    aggregates(
                        dsl = dsl,
                        table = spec.targetTable,
                        expressions = spec.aggregateExpressions,
                        tenantId = context.options.defaultTenant.id.takeIf { spec.tenantAware },
                    )
                }
            spec.aggregateExpressions.keys.forEach { metric ->
                val sourceValue = sourceAggregates.getValue(metric)
                val targetValue = targetAggregates.getValue(metric)
                metrics["$key.source-$metric"] = sourceValue.toPlainString()
                metrics["$key.target-$metric"] = targetValue.toPlainString()
                if (sourceValue.compareTo(targetValue) != 0) {
                    violations +=
                        "${spec.targetTable}: aggregate $metric differs " +
                        "(source=$sourceValue, target=$targetValue)"
                }
            }
        }

        return ValidationResult(
            taskId = taskId,
            passed = violations.isEmpty(),
            metrics = metrics,
            violations = violations,
            duration = Duration.between(startedAt, Instant.now(context.clock)),
        )
    }

    private fun stats(
        dsl: DSLContext,
        table: String,
        includeIds: Boolean,
        tenantId: Long? = null,
    ): TableStats {
        val renderedTable = dsl.render(DSL.name(table))
        val tenantFilter = tenantId?.let { " WHERE ${dsl.render(DSL.name("tenant_id"))} = ?" }.orEmpty()
        val bindings: Array<Any> =
            if (tenantId == null) {
                emptyArray()
            } else {
                arrayOf(tenantId)
            }
        if (!includeIds) {
            val count =
                requireNotNull(
                    dsl.fetchValue("SELECT COUNT(*) FROM $renderedTable$tenantFilter", *bindings) as Number?,
                ).toLong()
            return TableStats(count, 0, null, null)
        }
        val record =
            requireNotNull(
                dsl.fetchOne(
                    """
                    SELECT COUNT(*) AS row_count,
                           COALESCE(SUM(id), 0) AS id_sum,
                           MIN(id) AS min_id,
                           MAX(id) AS max_id
                    FROM $renderedTable$tenantFilter
                    """.trimIndent(),
                    *bindings,
                ),
            )
        return TableStats(
            count = requireNotNull(record.get("row_count", Long::class.java)),
            idSum = requireNotNull(record.get("id_sum", java.math.BigDecimal::class.java)).toLong(),
            minId = record.get("min_id", Long::class.java),
            maxId = record.get("max_id", Long::class.java),
        )
    }

    private fun aggregates(
        dsl: DSLContext,
        table: String,
        expressions: Map<String, String>,
        tenantId: Long? = null,
    ): Map<String, BigDecimal> {
        if (expressions.isEmpty()) return emptyMap()
        val renderedTable = dsl.render(DSL.name(table))
        val tenantFilter = tenantId?.let { " WHERE ${dsl.render(DSL.name("tenant_id"))} = ?" }.orEmpty()
        val bindings: Array<Any> = tenantId?.let { arrayOf(it) } ?: emptyArray()
        return expressions.mapValues { (_, expression) ->
            val value =
                requireNotNull(
                    dsl.fetchValue(
                        "SELECT COALESCE(SUM($expression), 0) FROM $renderedTable$tenantFilter",
                        *bindings,
                    ),
                )
            when (value) {
                is BigDecimal -> value
                is Number -> value.toString().toBigDecimal()
                else -> error("Aggregate $expression returned unsupported value ${value::class.qualifiedName}")
            }
        }
    }

    private data class TableStats(
        val count: Long,
        val idSum: Long,
        val minId: Long?,
        val maxId: Long?,
    )
}
