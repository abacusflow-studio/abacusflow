package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/** 校验默认租户唯一、状态正确，并且有且仅有一个有效 tenant_placement。 */
class TenantValidator : PlannedMigrationValidator(MigrationTaskId.TENANT)
