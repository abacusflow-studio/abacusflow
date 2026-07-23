package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 把 V1 用户写入 V2 user_account，并按已确认映射迁移 external identity。
 * 必须保留 ID/创建时间，显式处理源字段与目标 name/nick/email 模型不一致及重复用户名。
 */
class UserMigration : PlannedMigrationTask(MigrationTaskId.USER, setOf(MigrationTaskId.TENANT))
