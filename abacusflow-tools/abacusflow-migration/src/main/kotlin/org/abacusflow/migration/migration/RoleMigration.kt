package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 把 V1 role 转为默认租户 tenant_role。不允许直接保留 V1 role id，
 * 所有基础数据通过 v1_role_id_map 映射表转换。
 * 需评估 V2 预置 admin/reader/operator，通过确定性映射表解决同名角色。
 */
class RoleMigration : PlannedMigrationTask(MigrationTaskId.ROLE, setOf(MigrationTaskId.TENANT))
