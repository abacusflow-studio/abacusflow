package org.abacusflow.migration.migration

import org.abacusflow.migration.checkpoint.CheckpointKey
import org.abacusflow.migration.framework.BatchPage
import org.abacusflow.migration.framework.BatchProcessor
import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import org.jooq.impl.DSL

/**
 * 迁移 V1 角色-权限关联到 V2 的 tenant_role_permission 和 tenant_membership_role。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线中"权限体系层"的第三步，也是权限体系迁移的收尾任务。
 * V1 的角色-权限关联在 V2 中拆分为两种独立的关联类型：
 * 1. tenant_role_permission：角色与权限的关联（哪些角色拥有哪些权限）
 * 2. tenant_membership_role：成员关系与角色的关联（哪些用户拥有哪些角色）
 * 本任务需要将 V1 的 role_permission 关联数据分别写入这两张表，
 * 完成"权限分配"和"角色分配"两个维度的数据迁移。
 *
 * 【V1→V2 映射要点】
 * - V1 有一张 role_permission 关联表，通过 (role_id, permission_id) 复合键
 *   建立角色与权限的多对多关系。
 * - V2 将此拆分为两种关联：
 *   - tenant_role_permission：(tenant_id, role_id, permission_id) 复合键
 *   - tenant_membership_role：(tenant_id, membership_id, role_id) 复合键
 * - 两类关联都涉及复合键，且数据来源不同（前者来自 V1 role_permission，
 *   后者来自 V1 user_role 关联），因此必须使用**独立的 checkpoint stream**：
 *   - 一个 stream 跟踪 role_permission 的迁移进度
 *   - 另一个 stream 跟踪 membership_role 的迁移进度
 *   这样当某类关联迁移失败时，只需重跑该 stream，不影响另一类。
 * - 使用 v1_role_id_map 将 V1 角色 ID 转换为 V2 角色 ID
 *   （由 RoleMigration 写入控制表）
 * - 使用 v1_permission_id_map 将 V1 权限 ID 转换为 V2 权限 ID
 *   （由 PermissionMigration 写入控制表）
 * - 迁移顺序：先用业务键映射新 ID，再批量写关联记录，
 *   避免逐条映射+写入导致的性能问题。
 *
 * 【与其他组件的连接】
 * - 前置依赖：MEMBERSHIP + ROLE + PERMISSION（三重依赖）
 *   - MembershipMigration：提供 membership 记录和 v1_user_id_map，
 *     用于建立 tenant_membership_role 关联
 *   - RoleMigration：提供 v1_role_id_map，
 *     将 V1 角色 ID 转换为 V2 角色 ID
 *   - PermissionMigration：提供 v1_permission_id_map，
 *     将 V1 权限 ID 转换为 V2 权限 ID
 * - 下游依赖者：FinalizeMigration 依赖本任务完成
 *   （权限体系全部迁移完成后才能进行最终校验）
 *
 * 【Kotlin 语法要点】
 * - setOf(MigrationTaskId.MEMBERSHIP, MigrationTaskId.ROLE, MigrationTaskId.PERMISSION)：
 *   创建包含三个元素的不可变 Set，表示本任务同时依赖三个前置任务。
 *   这是迁移管线中依赖最多的任务之一，体现了权限体系的复杂性。
 * - 多行构造参数 + 末尾逗号：Kotlin 习惯在集合字面量中
 *   每个元素占一行并使用末尾逗号，便于版本控制（diff 友好）和未来扩展。
 */
class RolePermissionMigration(
    /**
     * 任务唯一标识符：MigrationTaskId.ROLE_PERMISSION。
     *
     * 枚举值 cliName="role-permission"，连字符分隔，
     * 用于 checkpoint 记录、CLI 参数匹配和日志输出。
     */
    id: MigrationTaskId = MigrationTaskId.ROLE_PERMISSION,
    /**
     * 前置依赖集合：{MEMBERSHIP, ROLE, PERMISSION}。
     *
     * 三重依赖，是管线中依赖最多的任务之一：
     * - MEMBERSHIP：提供 tenant_membership 记录和 v1_user_id_map
     * - ROLE：提供 v1_role_id_map，转换 V1 角色 ID → V2 角色 ID
     * - PERMISSION：提供 v1_permission_id_map，转换 V1 权限 ID → V2 权限 ID
     */
    dependencies: Set<MigrationTaskId> =
        setOf(
            MigrationTaskId.MEMBERSHIP,
            MigrationTaskId.ROLE,
            MigrationTaskId.PERMISSION,
        ),
) : PlannedMigrationTask(id, dependencies) {
    override fun execute(context: MigrationContext): TaskResult {
        val rolePermissionResult = migrateRolePermissions(context)
        val membershipRoleResult = migrateMembershipRoles(context)
        return listOf(rolePermissionResult, membershipRoleResult).toTaskResult(id)
    }

    private fun migrateRolePermissions(context: MigrationContext) =
        BatchProcessor().processBatches(
            context = context,
            checkpointKey = CheckpointKey(id, "tenant-role-permission"),
            readPage = { lastId, limit ->
                context.source.read { dsl ->
                    val roleId = DSL.field("id", Long::class.javaObjectType)
                    val roleIds =
                        dsl.select(roleId)
                            .from(DSL.table(DSL.name("role")))
                            .where(lastId?.let(roleId::gt) ?: DSL.noCondition())
                            .orderBy(roleId)
                            .limit(limit)
                            .fetch(roleId)
                    val links =
                        if (roleIds.isEmpty()) {
                            emptyMap()
                        } else {
                            val linkRoleId = DSL.field("role_id", Long::class.javaObjectType)
                            val permissionId = DSL.field("permission_id", Long::class.javaObjectType)
                            dsl.select(linkRoleId, permissionId)
                                .from(DSL.table(DSL.name("role_permission")))
                                .where(linkRoleId.`in`(roleIds))
                                .fetch()
                                .groupBy({ requireNotNull(it.value1()) }, { requireNotNull(it.value2()) })
                        }
                    BatchPage(
                        records = roleIds.map { sourceRoleId -> RoleLinks(sourceRoleId, links[sourceRoleId].orEmpty()) },
                        nextCursor = roleIds.lastOrNull(),
                    )
                }
            },
            transformAndWrite = { dsl, groups ->
                val roleMap = dsl.render(DSL.name(context.options.controlSchema, "v1_role_id_map"))
                val permissionMap = dsl.render(DSL.name(context.options.controlSchema, "v1_permission_id_map"))
                groups.forEach { group ->
                    group.linkedIds.forEach { v1PermissionId ->
                        val mapping =
                            dsl.fetchOne(
                                """
                                SELECT r.v2_role_id, p.v2_permission_id
                                FROM $roleMap r
                                CROSS JOIN $permissionMap p
                                WHERE r.v1_role_id = ? AND p.v1_permission_id = ?
                                """.trimIndent(),
                                group.sourceId,
                                v1PermissionId,
                            )
                        val v2RoleId =
                            requireNotNull(mapping?.get("v2_role_id", Long::class.java)) {
                                "Missing role mapping for V1 role ${group.sourceId}"
                            }
                        val v2PermissionId =
                            requireNotNull(mapping.get("v2_permission_id", Long::class.java)) {
                                "Missing permission mapping for V1 permission $v1PermissionId"
                            }
                        dsl.execute(
                            """
                            INSERT INTO tenant_role_permission (role_id, permission_id)
                            VALUES (?, ?) ON CONFLICT DO NOTHING
                            """.trimIndent(),
                            v2RoleId,
                            v2PermissionId,
                        )
                    }
                }
                groups.size
            },
        )

    private fun migrateMembershipRoles(context: MigrationContext) =
        BatchProcessor().processBatches(
            context = context,
            checkpointKey = CheckpointKey(id, "tenant-membership-role"),
            readPage = { lastId, limit ->
                context.source.read { dsl ->
                    val userId = DSL.field("id", Long::class.javaObjectType)
                    val userIds =
                        dsl.select(userId)
                            .from(DSL.table(DSL.name("user_account")))
                            .where(lastId?.let(userId::gt) ?: DSL.noCondition())
                            .orderBy(userId)
                            .limit(limit)
                            .fetch(userId)
                    val links =
                        if (userIds.isEmpty()) {
                            emptyMap()
                        } else {
                            val linkUserId = DSL.field("user_id", Long::class.javaObjectType)
                            val roleId = DSL.field("role_id", Long::class.javaObjectType)
                            dsl.select(linkUserId, roleId)
                                .from(DSL.table(DSL.name("user_role")))
                                .where(linkUserId.`in`(userIds))
                                .fetch()
                                .groupBy({ requireNotNull(it.value1()) }, { requireNotNull(it.value2()) })
                        }
                    BatchPage(
                        records = userIds.map { sourceUserId -> RoleLinks(sourceUserId, links[sourceUserId].orEmpty()) },
                        nextCursor = userIds.lastOrNull(),
                    )
                }
            },
            transformAndWrite = { dsl, groups ->
                val userMap = dsl.render(DSL.name(context.options.controlSchema, "v1_user_id_map"))
                val roleMap = dsl.render(DSL.name(context.options.controlSchema, "v1_role_id_map"))
                groups.forEach { group ->
                    group.linkedIds.forEach { v1RoleId ->
                        val mapping =
                            dsl.fetchOne(
                                """
                                SELECT membership.id AS membership_id, role_map.v2_role_id
                                FROM $userMap user_map
                                JOIN tenant_membership membership
                                  ON membership.user_id = user_map.v2_user_id
                                 AND membership.tenant_id = ?
                                CROSS JOIN $roleMap role_map
                                WHERE user_map.v1_user_id = ? AND role_map.v1_role_id = ?
                                """.trimIndent(),
                                context.options.defaultTenant.id,
                                group.sourceId,
                                v1RoleId,
                            )
                        val membershipId =
                            requireNotNull(mapping?.get("membership_id", Long::class.java)) {
                                "Missing membership mapping for V1 user ${group.sourceId}"
                            }
                        val v2RoleId =
                            requireNotNull(mapping.get("v2_role_id", Long::class.java)) {
                                "Missing role mapping for V1 role $v1RoleId"
                            }
                        dsl.execute(
                            """
                            INSERT INTO tenant_membership_role (membership_id, role_id)
                            VALUES (?, ?) ON CONFLICT DO NOTHING
                            """.trimIndent(),
                            membershipId,
                            v2RoleId,
                        )
                    }
                }
                groups.size
            },
        )

    private data class RoleLinks(
        val sourceId: Long,
        val linkedIds: List<Long>,
    )
}
