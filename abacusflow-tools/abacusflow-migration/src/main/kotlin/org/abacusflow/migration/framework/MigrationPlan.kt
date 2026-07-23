package org.abacusflow.migration.framework

/**
 * 固定有序任务列表。不使用 DAG/拓扑排序，按预定义顺序执行。
 * resolve 方法按固定顺序过滤并补齐依赖闭包。
 */
class MigrationPlan(
    val tasks: List<MigrationTask>,
) {
    /** 按固定顺序返回全部任务。 */
    fun resolve(selection: MigrationSelection): List<MigrationTask> =
        when (selection) {
            is MigrationSelection.All -> tasks
            is MigrationSelection.Selected -> {
                val closure = MigrationSelection.resolveClosure(selection.taskIds)
                tasks.filter { it.id in closure }
            }
        }
}
