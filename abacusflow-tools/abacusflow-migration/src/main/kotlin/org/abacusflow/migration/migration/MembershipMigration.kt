package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 为每个有效 V1 用户创建默认租户 membership。checkpoint stream 应按源 user ID 前进，
 * 写入需依赖 (tenant_id, user_id) 唯一键实现可重入，并明确禁用/锁定用户的 membership 状态。
 * 使用 v1_user_id_map 查找 V2 user ID。
 */
class MembershipMigration :
    PlannedMigrationTask(
        MigrationTaskId.MEMBERSHIP,
        setOf(MigrationTaskId.TENANT, MigrationTaskId.USER),
    )
