package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 写 tenant_role_permission 与 tenant_membership_role 两类关联。
 * 两者多为复合键，因此分别使用 checkpoint stream；先用业务键映射新 ID，再批量写关联。
 * 使用 v1_role_id_map 和 v1_permission_id_map 进行 ID 转换。
 */
class RolePermissionMigration :
    PlannedMigrationTask(
        MigrationTaskId.ROLE_PERMISSION,
        setOf(
            MigrationTaskId.MEMBERSHIP,
            MigrationTaskId.ROLE,
            MigrationTaskId.PERMISSION,
        ),
    )
