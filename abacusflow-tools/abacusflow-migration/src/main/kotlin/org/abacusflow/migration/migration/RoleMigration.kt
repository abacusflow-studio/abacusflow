package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 把 V1 role 转为默认租户 tenant_role。保留 ID 前必须评估 V2 预置 admin/reader/operator，
 * 并通过确定性映射表解决同名角色，而不是依赖数据库当前自增值。
 */
class RoleMigration : PlannedMigrationTask(MigrationTaskId.ROLE, setOf(MigrationTaskId.TENANT))
