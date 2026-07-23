package org.abacusflow.migration.framework

/**
 * 有序任务图。Runner 必须验证：任务 ID 唯一、依赖存在、无环，并为局部迁移补齐依赖闭包。
 */
class MigrationPlan(
    val tasks: List<MigrationTask>,
) {
    fun resolve(selection: MigrationSelection): List<MigrationTask> =
        throw UnsupportedOperationException("Implement dependency validation and selection resolution")
}
