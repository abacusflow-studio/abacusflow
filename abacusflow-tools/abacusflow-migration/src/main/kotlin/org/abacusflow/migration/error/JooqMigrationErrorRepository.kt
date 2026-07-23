package org.abacusflow.migration.error

import org.abacusflow.migration.database.TargetDatabase
import org.jooq.impl.DSL

/** jOOQ 实现的错误记录仓储。使用独立短事务，确保错误记录不会随业务批次回滚。 */
class JooqMigrationErrorRepository(
    private val target: TargetDatabase,
    private val controlSchema: String = "abacusflow_migration",
) : MigrationErrorRepository {
    private val table = DSL.table(DSL.name(controlSchema, "migration_error"))

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
