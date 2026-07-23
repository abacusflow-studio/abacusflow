package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/** 校验所有 identity sequence 的下一值大于当前最大 ID，并汇总所有任务结果。 */
class FinalizeValidator : PlannedMigrationValidator(MigrationTaskId.FINALIZE)
