package org.abacusflow.migration.run

import org.abacusflow.migration.database.TargetDatabase
import org.abacusflow.migration.framework.MigrationTaskId
import org.jooq.DSLContext
import org.jooq.SQLDialect
import org.jooq.impl.DSL
import org.jooq.tools.jdbc.MockConnection
import org.jooq.tools.jdbc.MockDataProvider
import org.jooq.tools.jdbc.MockExecuteContext
import org.jooq.tools.jdbc.MockResult
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals

class JooqMigrationRunRepositoryTest {
    @Test
    fun `selected tasks are bound as PostgreSQL jsonb`() {
        val executions = mutableListOf<MockExecuteContext>()
        val provider =
            MockDataProvider { context ->
                executions += context
                arrayOf(MockResult(1))
            }
        val connection = MockConnection(provider)
        val target = MockTargetDatabase(DSL.using(connection, SQLDialect.POSTGRES))
        val repository = JooqMigrationRunRepository(target)

        repository.start(
            MigrationRun(
                runId = UUID.fromString("00000000-0000-0000-0000-000000000001"),
                status = MigrationRunStatus.RUNNING,
                selectedTasks = setOf(MigrationTaskId.USER, MigrationTaskId.TENANT),
                startedAt = Instant.parse("2026-07-30T12:00:00Z"),
                finishedAt = null,
            ),
        )

        val execution = executions.single()
        assertContains(execution.sql().lowercase(), "cast(? as jsonb)")
        assertEquals("[\"tenant\",\"user\"]", execution.bindings()[2])
    }

    private class MockTargetDatabase(
        private val dsl: DSLContext,
    ) : TargetDatabase {
        override fun <T> read(block: (DSLContext) -> T): T = block(dsl)

        override fun <T> transaction(block: (DSLContext) -> T): T = block(dsl)

        override fun close() = Unit
    }
}
