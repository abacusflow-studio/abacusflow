package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 把 V1 用户写入 V2 user_account，并按已确认映射迁移 external identity。
 * 必须建立 v1_user_id → v2_user_id 映射，用于后续 membership/order creator 等关联。
 * 发现已有用户时建立 mapping，复用 V2 用户 ID，禁止简单 ON CONFLICT DO NOTHING。
 */
class UserMigration : PlannedMigrationTask(MigrationTaskId.USER, setOf(MigrationTaskId.TENANT))
