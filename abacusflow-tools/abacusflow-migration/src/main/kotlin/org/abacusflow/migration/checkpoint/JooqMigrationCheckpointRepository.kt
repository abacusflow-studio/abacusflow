package org.abacusflow.migration.checkpoint

import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.time.Instant
import java.util.UUID

/** jOOQ 实现的 checkpoint 仓储。save 必须使用业务批次传入的 transaction，保证原子提交。 */
class JooqMigrationCheckpointRepository(
    private val controlSchema: String = "abacusflow_migration",
) : MigrationCheckpointRepository {
    private val table = DSL.table(DSL.name(controlSchema, "migration_checkpoint"))

    override fun find(
        dsl: DSLContext,
        key: CheckpointKey,
    ): MigrationCheckpoint? {
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
