package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 最终化任务：为所有保留原 ID 的 identity/sequence 对齐 next value，刷新统计信息，并生成摘要。
 * 必须在校验通过后才允许标记整次 run 完成；具体 DDL 需由数据库负责人审核。
 */
class FinalizeMigration :
    PlannedMigrationTask(
        MigrationTaskId.FINALIZE,
        setOf(MigrationTaskId.ROLE_PERMISSION, MigrationTaskId.SALE_ORDER),
    )
