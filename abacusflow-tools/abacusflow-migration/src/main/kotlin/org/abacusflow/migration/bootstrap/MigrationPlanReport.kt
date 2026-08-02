package org.abacusflow.migration.bootstrap

import org.abacusflow.migration.check.SchemaChecker
import org.abacusflow.migration.framework.MigrationTaskId

/**
 * `plan` 命令的只读结果。
 *
 * 它同时包含数据库结构检查结果和依赖解析后的真实执行顺序。`plan` 不初始化控制
 * schema，也不会获取迁移锁，因此可以安全地用于正式迁移前的环境诊断。
 */
data class MigrationPlanReport(
    val schemaCheck: SchemaChecker.SchemaCheckResult,
    val tasks: List<MigrationTaskId>,
) {
    val executable: Boolean get() = schemaCheck.passed
}
