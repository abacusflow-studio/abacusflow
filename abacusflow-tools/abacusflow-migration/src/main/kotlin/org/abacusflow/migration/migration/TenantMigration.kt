package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 创建默认 tenant 与 tenant_placement。实现前需确认 ID=1 是否已被 V2 seed 占用，
 * 并定义“目标已有默认租户”时复用、校验还是失败，不能盲目覆盖。
 */
class TenantMigration : PlannedMigrationTask(MigrationTaskId.TENANT, emptySet())
