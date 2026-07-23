package org.abacusflow.migration.framework

import org.abacusflow.migration.checkpoint.MigrationCheckpointRepository
import org.abacusflow.migration.config.MigrationOptions
import org.abacusflow.migration.database.SourceDatabase
import org.abacusflow.migration.database.TargetDatabase
import org.abacusflow.migration.error.MigrationErrorRepository
import org.abacusflow.migration.report.ProgressReporter
import org.abacusflow.migration.run.MigrationRunRepository
import java.time.Clock
import java.util.UUID

/** 单次运行共享的显式依赖；不要使用全局单例或隐藏的线程上下文。 */
data class MigrationContext(
    val runId: UUID,
    val source: SourceDatabase,
    val target: TargetDatabase,
    val checkpoints: MigrationCheckpointRepository,
    val errors: MigrationErrorRepository,
    val runs: MigrationRunRepository,
    val options: MigrationOptions,
    val progress: ProgressReporter,
    val clock: Clock = Clock.systemUTC(),
)
