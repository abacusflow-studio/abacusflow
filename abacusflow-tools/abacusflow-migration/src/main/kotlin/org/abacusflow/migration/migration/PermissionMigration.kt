package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移或映射 permission。V2 已有权限 taxonomy/seed，必须先产出 V1 code -> V2 name 的映射清单，
 * 区分 PLATFORM、TENANT、BUSINESS scope；禁止仅按数字 ID 关联。
 * 建立 v1_permission_id_map 映射表。
 */
class PermissionMigration :
    PlannedMigrationTask(
        MigrationTaskId.PERMISSION,
        setOf(MigrationTaskId.ROLE),
    )
