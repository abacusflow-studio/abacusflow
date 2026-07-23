package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import java.time.Duration

/**
 * 校验与迁移写入分离，使 validate 命令可重复执行。每个任务至少注册一个同 ID Validator。
 */
interface MigrationValidator {
    val taskId: MigrationTaskId

    fun validate(context: MigrationContext): ValidationResult
}

data class ValidationResult(
    val taskId: MigrationTaskId,
    val passed: Boolean,
    val metrics: Map<String, String>,
    val violations: List<String>,
    val duration: Duration,
)

data class ValidationReport(
    val results: List<ValidationResult>,
) {
    val passed: Boolean = results.all(ValidationResult::passed)
}

/** 安全占位：未实现的 Validator 绝不返回 PASS。 */
abstract class PlannedMigrationValidator(
    final override val taskId: MigrationTaskId,
) : MigrationValidator {
    override fun validate(context: MigrationContext): ValidationResult =
        throw UnsupportedOperationException(
            "Validator ${taskId.cliName} is not implemented (runId=${context.runId})",
        )
}
