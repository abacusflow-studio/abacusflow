package org.abacusflow.migration.bootstrap

import io.github.oshai.kotlinlogging.KotlinLogging
import org.abacusflow.migration.checkpoint.JooqMigrationCheckpointRepository
import org.abacusflow.migration.database.SourceDatabase
import org.abacusflow.migration.database.TargetDatabase
import org.abacusflow.migration.error.JooqMigrationErrorRepository
import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationReport
import org.abacusflow.migration.framework.MigrationRunner
import org.abacusflow.migration.framework.MigrationSelection
import org.abacusflow.migration.migration.StandardMigrationPlan
import org.abacusflow.migration.report.ConsoleProgressReporter
import org.abacusflow.migration.run.JooqMigrationRunRepository
import org.abacusflow.migration.validation.StandardValidationPlan
import org.abacusflow.migration.validation.ValidationReport
import java.time.Clock
import java.time.Instant
import java.util.UUID

private val logger = KotlinLogging.logger {}

/** MigrationApplication 的默认实现：编排 migrate 和 validate 命令。 */
class DefaultMigrationApplication(
    private val source: SourceDatabase,
    private val target: TargetDatabase,
) : MigrationApplication {
    override fun migrate(selection: MigrationSelection): MigrationReport {
        val runId = UUID.randomUUID()
        val controlSchema = "abacusflow_migration"

        val checkpoints = JooqMigrationCheckpointRepository(controlSchema)
        val errors = JooqMigrationErrorRepository(target, controlSchema)
        val runs = JooqMigrationRunRepository(target, controlSchema)
        val progress = ConsoleProgressReporter()
        val plan = StandardMigrationPlan.create()
        val runner = MigrationRunner(plan)

        val context =
            MigrationContext(
                runId = runId,
                source = source,
                target = target,
                checkpoints = checkpoints,
                errors = errors,
                runs = runs,
                options = org.abacusflow.migration.config.MigrationOptions(),
                progress = progress,
                clock = Clock.systemUTC(),
            )

        logger.info { "Starting migration run $runId" }
        val report = runner.run(context, selection)
        logger.info {
            "Migration run $runId ${if (report.taskResults.all { it.errorCount == 0L }) "succeeded" else "had errors"} " +
                "in ${report.duration}"
        }
        return report
    }

    override fun validate(selection: MigrationSelection): ValidationReport {
        val runId = UUID.randomUUID()
        val controlSchema = "abacusflow_migration"

        val checkpoints = JooqMigrationCheckpointRepository(controlSchema)
        val errors = JooqMigrationErrorRepository(target, controlSchema)
        val runs = JooqMigrationRunRepository(target, controlSchema)
        val progress = ConsoleProgressReporter()

        val context =
            MigrationContext(
                runId = runId,
                source = source,
                target = target,
                checkpoints = checkpoints,
                errors = errors,
                runs = runs,
                options = org.abacusflow.migration.config.MigrationOptions(),
                progress = progress,
                clock = Clock.systemUTC(),
            )

        val validators = StandardValidationPlan.create()
        val results =
            validators.map { validator ->
                val start = Instant.now()
                try {
                    validator.validate(context)
                } catch (e: UnsupportedOperationException) {
                    org.abacusflow.migration.validation.ValidationResult(
                        taskId = validator.taskId,
                        passed = false,
                        metrics = mapOf("status" to "not_implemented"),
                        violations = listOf("Validator not implemented: ${e.message}"),
                        duration = java.time.Duration.between(start, Instant.now()),
                    )
                }
            }

        return ValidationReport(results)
    }

    override fun close() {
        runCatching { source.close() }.onFailure { logger.warn(it) { "Failed to close source database" } }
        runCatching { target.close() }.onFailure { logger.warn(it) { "Failed to close target database" } }
    }
}
