package org.abacusflow.migration.framework

import org.abacusflow.migration.checkpoint.CheckpointKey
import org.abacusflow.migration.checkpoint.MigrationCheckpoint
import org.abacusflow.migration.checkpoint.MigrationCheckpointRepository
import org.abacusflow.migration.config.MigrationOptions
import org.abacusflow.migration.database.SourceDatabase
import org.abacusflow.migration.database.TargetDatabase
import org.abacusflow.migration.error.MigrationError
import org.abacusflow.migration.error.MigrationErrorRepository
import org.abacusflow.migration.report.ProgressReporter
import org.abacusflow.migration.run.MigrationRun
import org.abacusflow.migration.run.MigrationRunRepository
import org.abacusflow.migration.run.MigrationRunStatus
import org.jooq.DSLContext
import org.jooq.SQLDialect
import org.jooq.impl.DSL
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class BatchProcessorTest {
    @Test
    fun `incompatible checkpoint version restarts from the beginning`() {
        val key = CheckpointKey(MigrationTaskId.USER, "users")
        val checkpoints = InMemoryCheckpoints(checkpoint(key, cursor = "50", processed = 50, version = 1))
        val fixture = fixture(checkpoints)
        val observedCursors = mutableListOf<Long?>()

        val result =
            BatchProcessor().processBatches(
                context = fixture.context,
                checkpointKey = key,
                implementationVersion = 2,
                readPage = { cursor, _ ->
                    observedCursors += cursor
                    if (cursor == null) BatchPage(listOf("row"), 1) else BatchPage(emptyList(), null)
                },
                transformAndWrite = { _, rows -> rows.size },
            )

        assertNull(observedCursors.first())
        assertEquals(1, result.processedCount)
        assertEquals(2, checkpoints.value?.implementationVersion)
    }

    @Test
    fun `compatible checkpoint resumes cursor and cumulative count`() {
        val key = CheckpointKey(MigrationTaskId.USER, "users")
        val checkpoints = InMemoryCheckpoints(checkpoint(key, cursor = "50", processed = 50, version = 3))
        val fixture = fixture(checkpoints)
        val observedCursors = mutableListOf<Long?>()

        val result =
            BatchProcessor().processBatches(
                context = fixture.context,
                checkpointKey = key,
                implementationVersion = 3,
                readPage = { cursor, _ ->
                    observedCursors += cursor
                    if (cursor == 50L) BatchPage(listOf("row"), 51) else BatchPage(emptyList(), null)
                },
                transformAndWrite = { _, rows -> rows.size },
            )

        assertEquals(50L, observedCursors.first())
        assertEquals(51, result.processedCount)
        assertEquals("51", checkpoints.value?.cursor)
    }

    @Test
    fun `failed transaction records one error and does not retry the same page forever`() {
        val key = CheckpointKey(MigrationTaskId.USER, "users")
        val checkpoints = InMemoryCheckpoints()
        val fixture = fixture(checkpoints)
        var reads = 0

        assertFailsWith<IllegalArgumentException> {
            BatchProcessor().processBatches(
                context = fixture.context,
                checkpointKey = key,
                readPage = { _, _ ->
                    reads++
                    BatchPage(listOf("bad-row"), 1)
                },
                transformAndWrite = { _, _ -> throw IllegalArgumentException("invalid row") },
            )
        }

        assertEquals(1, reads)
        assertEquals(1, fixture.errors.size)
        assertEquals("batch-after-null", fixture.errors.single().recordKey)
        assertEquals(false, fixture.errors.single().retryable)
        assertNull(checkpoints.value)
    }

    private fun checkpoint(
        key: CheckpointKey,
        cursor: String,
        processed: Long,
        version: Int,
    ) = MigrationCheckpoint(
        key = key,
        cursor = cursor,
        processedCount = processed,
        runId = RUN_ID,
        implementationVersion = version,
        updatedAt = NOW,
    )

    private fun fixture(checkpoints: InMemoryCheckpoints): Fixture {
        val errors = mutableListOf<MigrationError>()
        return Fixture(
            context =
                MigrationContext(
                    runId = RUN_ID,
                    source = NoOpSource,
                    target = NoOpTarget,
                    checkpoints = checkpoints,
                    errors = MigrationErrorRepository(errors::add),
                    runs = NoOpRuns,
                    options = MigrationOptions(batchSize = 10, fetchSize = 10),
                    progress = NoOpProgress,
                    clock = Clock.fixed(NOW, ZoneOffset.UTC),
                ),
            errors = errors,
        )
    }

    private data class Fixture(
        val context: MigrationContext,
        val errors: List<MigrationError>,
    )

    private class InMemoryCheckpoints(
        var value: MigrationCheckpoint? = null,
    ) : MigrationCheckpointRepository {
        override fun find(
            dsl: DSLContext,
            key: CheckpointKey,
        ): MigrationCheckpoint? = value?.takeIf { it.key == key }

        override fun save(
            transaction: DSLContext,
            checkpoint: MigrationCheckpoint,
        ) {
            value = checkpoint
        }
    }

    private object NoOpSource : SourceDatabase {
        override fun <T> read(block: (DSLContext) -> T): T = block(DSL.using(SQLDialect.POSTGRES))

        override fun close() = Unit
    }

    private object NoOpTarget : TargetDatabase {
        override fun <T> read(block: (DSLContext) -> T): T = block(DSL.using(SQLDialect.POSTGRES))

        override fun <T> transaction(block: (DSLContext) -> T): T = block(DSL.using(SQLDialect.POSTGRES))

        override fun close() = Unit
    }

    private object NoOpRuns : MigrationRunRepository {
        override fun start(run: MigrationRun) = Unit

        override fun taskStarted(
            runId: UUID,
            taskId: MigrationTaskId,
        ) = Unit

        override fun taskCompleted(
            runId: UUID,
            result: TaskResult,
        ) = Unit

        override fun taskFailed(
            runId: UUID,
            taskId: MigrationTaskId,
            finishedAt: Instant,
            message: String?,
        ) = Unit

        override fun finish(
            runId: UUID,
            status: MigrationRunStatus,
            finishedAt: Instant,
            message: String?,
        ) = Unit
    }

    private object NoOpProgress : ProgressReporter {
        override fun taskStarted(
            taskId: MigrationTaskId,
            estimatedTotal: Long?,
        ) = Unit

        override fun batchCompleted(
            taskId: MigrationTaskId,
            processedCount: Long,
            elapsed: Duration,
        ) = Unit

        override fun taskCompleted(result: TaskResult) = Unit
    }

    private companion object {
        val RUN_ID: UUID = UUID.fromString("00000000-0000-0000-0000-000000000001")
        val NOW: Instant = Instant.parse("2026-07-30T12:00:00Z")
    }
}
