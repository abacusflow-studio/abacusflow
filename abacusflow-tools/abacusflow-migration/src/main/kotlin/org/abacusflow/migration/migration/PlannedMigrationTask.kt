package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTask
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult

/**
 * 安全占位基类：骨架阶段任何任务都不能空跑后返回“成功”。
 * 实现者完成任务时应覆盖 execute，并删除该任务继承到的占位行为。
 */
abstract class PlannedMigrationTask(
    final override val id: MigrationTaskId,
    final override val dependencies: Set<MigrationTaskId>,
) : MigrationTask {
    override fun execute(context: MigrationContext): TaskResult =
        throw UnsupportedOperationException(
            "Task ${id.cliName} is a strategic skeleton and has no data implementation (runId=${context.runId})",
        )
}
