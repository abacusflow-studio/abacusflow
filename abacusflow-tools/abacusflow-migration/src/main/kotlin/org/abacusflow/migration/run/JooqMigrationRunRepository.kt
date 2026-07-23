package org.abacusflow.migration.run

import org.abacusflow.migration.database.TargetDatabase
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import org.jooq.impl.DSL
import java.time.Instant
import java.util.UUID

/** jOOQ 实现的运行状态仓储。使用独立短事务，使失败状态不会随业务批次一起回滚。 */
class JooqMigrationRunRepository(
    private val target: TargetDatabase,
    private val controlSchema: String = "abacusflow_migration",
) : MigrationRunRepository {
    private val runTable = DSL.table(DSL.name(controlSchema, "migration_run"))
    private val taskRunTable = DSL.table(DSL.name(controlSchema, "migration_task_run"))

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
