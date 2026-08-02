package org.abacusflow.migration.migration

import org.abacusflow.migration.checkpoint.CheckpointKey
import org.abacusflow.migration.framework.BatchPage
import org.abacusflow.migration.framework.BatchProcessor
import org.abacusflow.migration.framework.BatchResult
import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationRecordException
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import org.jooq.DSLContext
import org.jooq.Field
import org.jooq.impl.DSL

/** 一列从 V1 到 V2 的稳定映射；枚举通过显式 PostgreSQL cast 绑定。 */
internal data class TableColumn(
    val sourceName: String,
    val targetName: String = sourceName,
    val javaType: Class<*>,
    val sourceAsText: Boolean = false,
    val targetCast: String? = null,
)

/** 从源库读取的一行；values 顺序与 TableColumn 列表严格一致。 */
internal data class TableRow(
    val id: Long,
    val values: List<Any?>,
)

/**
 * 保留 V1 主键的通用表迁移器。
 *
 * V2 业务表在默认租户内使用 V1 ID，因而原有外键无需额外映射。重复执行时，
 * 同一主键由源库值确定性覆盖；其他唯一键冲突仍会失败，避免静默吞掉脏数据。
 */
internal class TableMigrationSupport(
    private val batchProcessor: BatchProcessor = BatchProcessor(),
) {
    fun migrate(
        context: MigrationContext,
        taskId: MigrationTaskId,
        stream: String,
        sourceTable: String,
        targetTable: String = sourceTable,
        columns: List<TableColumn>,
        tenantAware: Boolean = true,
        implementationVersion: Int = 1,
        afterBatch: (DSLContext, List<TableRow>) -> Unit = { _, _ -> },
    ): BatchResult {
        require(columns.firstOrNull()?.sourceName == "id") {
            "The first column of $sourceTable must be the Long id cursor"
        }

        return batchProcessor.processBatches(
            context = context,
            checkpointKey = CheckpointKey(taskId, stream),
            implementationVersion = implementationVersion,
            readPage = { lastId, limit ->
                readPage(context, sourceTable, columns, lastId, limit)
            },
            transformAndWrite = { dsl, rows ->
                if (tenantAware) setTenantContext(dsl, context.options.defaultTenant.id)
                val sql = upsertSql(dsl, targetTable, columns, tenantAware)
                rows.forEach { row ->
                    try {
                        val bindings =
                            if (tenantAware) {
                                row.values + context.options.defaultTenant.id
                            } else {
                                row.values
                            }
                        dsl.query(sql, *bindings.toTypedArray()).execute()
                    } catch (e: Exception) {
                        throw MigrationRecordException("$sourceTable:${row.id}", e)
                    }
                }
                try {
                    afterBatch(dsl, rows)
                } catch (e: Exception) {
                    if (e is MigrationRecordException) throw e
                    throw MigrationRecordException("$sourceTable:batch", e)
                }
                rows.size
            },
        )
    }

    /** 第二阶段外键回填；适用于 product_category.parent_id 这类自引用关系。 */
    fun update(
        context: MigrationContext,
        taskId: MigrationTaskId,
        stream: String,
        sourceTable: String,
        targetTable: String = sourceTable,
        columns: List<TableColumn>,
        tenantAware: Boolean = true,
        implementationVersion: Int = 1,
    ): BatchResult {
        require(columns.size > 1 && columns.first().sourceName == "id")
        return batchProcessor.processBatches(
            context = context,
            checkpointKey = CheckpointKey(taskId, stream),
            implementationVersion = implementationVersion,
            readPage = { lastId, limit ->
                readPage(context, sourceTable, columns, lastId, limit)
            },
            transformAndWrite = { dsl, rows ->
                if (tenantAware) setTenantContext(dsl, context.options.defaultTenant.id)
                val sql = updateSql(dsl, targetTable, columns, tenantAware)
                rows.forEach { row ->
                    try {
                        val bindings =
                            row.values.drop(1) +
                                row.id +
                                if (tenantAware) listOf(context.options.defaultTenant.id) else emptyList()
                        check(dsl.query(sql, *bindings.toTypedArray()).execute() == 1) {
                            "Cannot update migrated $targetTable row id=${row.id}"
                        }
                    } catch (e: Exception) {
                        throw MigrationRecordException("$sourceTable:${row.id}", e)
                    }
                }
                rows.size
            },
        )
    }

    private fun readPage(
        context: MigrationContext,
        sourceTable: String,
        columns: List<TableColumn>,
        lastId: Long?,
        limit: Int,
    ): BatchPage<TableRow> =
        context.source.read { dsl ->
            val idField = DSL.field(DSL.name("id"), Long::class.javaObjectType)
            val fields = columns.map(::sourceField)
            val condition = lastId?.let(idField::gt) ?: DSL.noCondition()
            val query =
                dsl.select(fields)
                    .from(DSL.table(DSL.name(sourceTable)))
                    .where(condition)
                    .orderBy(idField.asc())
                    .limit(limit)
            query.fetchSize(context.options.fetchSize)
            val rows =
                query.fetch { record ->
                    TableRow(
                        id = requireNotNull(record.get(idField)) { "$sourceTable.id must not be null" },
                        values = fields.map(record::get),
                    )
                }
            BatchPage(rows, rows.lastOrNull()?.id)
        }

    @Suppress("UNCHECKED_CAST")
    private fun sourceField(column: TableColumn): Field<Any?> {
        val type = column.javaType as Class<Any?>
        val named = DSL.field(DSL.name(column.sourceName), type)
        return if (column.sourceAsText) {
            DSL.field("CAST({0} AS VARCHAR)", String::class.java, named) as Field<Any?>
        } else {
            named
        }
    }

    private fun upsertSql(
        dsl: DSLContext,
        targetTable: String,
        columns: List<TableColumn>,
        tenantAware: Boolean,
    ): String {
        val targetColumns = columns.map { it.targetName } + if (tenantAware) listOf("tenant_id") else emptyList()
        val renderedColumns = targetColumns.joinToString(", ") { dsl.render(DSL.name(it)) }
        val placeholders =
            columns.map { column ->
                column.targetCast?.let { cast -> "CAST(? AS ${renderPostgresTypeName(cast)})" } ?: "?"
            } + if (tenantAware) listOf("?") else emptyList()
        val updates =
            targetColumns
                .filterNot { it == "id" }
                .joinToString(", ") { name ->
                    val rendered = dsl.render(DSL.name(name))
                    "$rendered = EXCLUDED.$rendered"
                }
        return "INSERT INTO ${dsl.render(DSL.name(targetTable))} ($renderedColumns) " +
            "VALUES (${placeholders.joinToString(", ")}) " +
            "ON CONFLICT (${dsl.render(DSL.name("id"))}) DO UPDATE SET $updates"
    }

    private fun updateSql(
        dsl: DSLContext,
        targetTable: String,
        columns: List<TableColumn>,
        tenantAware: Boolean,
    ): String {
        val assignments =
            columns.drop(1).joinToString(", ") { column ->
                val rendered = dsl.render(DSL.name(column.targetName))
                val value =
                    column.targetCast?.let { cast -> "CAST(? AS ${renderPostgresTypeName(cast)})" } ?: "?"
                "$rendered = $value"
            }
        val idPredicate = "${dsl.render(DSL.name("id"))} = ?"
        val tenantPredicate =
            if (tenantAware) {
                " AND ${dsl.render(DSL.name("tenant_id"))} = ?"
            } else {
                ""
            }
        return "UPDATE ${dsl.render(DSL.name(targetTable))} SET $assignments WHERE $idPredicate$tenantPredicate"
    }
}

/** 仅允许代码内声明的简单 PostgreSQL 类型名；数组后缀不能作为标识符整体加引号。 */
internal fun renderPostgresTypeName(typeName: String): String {
    require(POSTGRES_TYPE_NAME.matches(typeName)) { "Unsafe PostgreSQL type name: $typeName" }
    return typeName
}

private val POSTGRES_TYPE_NAME = Regex("[a-z_][a-z0-9_]*(?:\\[\\])?")

internal fun setTenantContext(
    dsl: DSLContext,
    tenantId: Long,
) {
    dsl.fetch("SELECT set_config('app.tenant_id', ?, true)", tenantId.toString())
}

internal fun List<BatchResult>.toTaskResult(taskId: MigrationTaskId): TaskResult =
    TaskResult(
        taskId = taskId,
        processedCount = sumOf { it.processedCount },
        skippedCount = sumOf { it.skippedCount },
        errorCount = sumOf { it.errorCount },
    )
