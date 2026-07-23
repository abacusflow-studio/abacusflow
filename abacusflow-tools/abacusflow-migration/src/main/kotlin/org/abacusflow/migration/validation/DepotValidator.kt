package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/** 校验仓库数量、名称唯一性和租户归属。 */
class DepotValidator : PlannedMigrationValidator(MigrationTaskId.DEPOT)
