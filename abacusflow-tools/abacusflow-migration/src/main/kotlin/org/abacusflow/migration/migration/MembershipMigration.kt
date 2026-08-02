package org.abacusflow.migration.migration

import org.abacusflow.migration.checkpoint.CheckpointKey
import org.abacusflow.migration.framework.BatchPage
import org.abacusflow.migration.framework.BatchProcessor
import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import org.jooq.impl.DSL

/**
 * 为每个有效 V1 用户创建 V2 默认租户的成员关系（tenant_membership）。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线中"基础实体层"的第三步，负责在 V2 的 tenant_membership
 * 表中为每个有效的 V1 用户创建成员记录，建立"用户归属租户"的关联关系。
 * V2 的多租户架构要求每个用户必须通过 tenant_membership 显式关联到租户，
 * 而 V1 是单租户架构，用户天然属于系统，无需显式成员关系。
 * 本任务填补了这一架构差异，使 V1 用户在 V2 中获得合法的租户归属。
 *
 * 【V1→V2 映射要点】
 * - V1 没有成员关系表（单租户下用户天然属于系统），
 *   V2 新增了 tenant_membership 表，通过 (tenant_id, user_id) 唯一键
 *   建立用户与租户的多对多关联。
 * - 使用 v1_user_id_map（由 UserMigration 写入控制表）查找每个 V1 用户
 *   对应的 V2 user_id，再结合 TenantMigration 产出的默认租户 ID，
 *   构造 tenant_membership 记录。
 * - 必须处理 V1 中被禁用（disabled）或锁定（locked）的用户：
 *   这些用户在 V2 中的 membership 状态应反映其 V1 状态
 *   （如设置为 DISABLED 或 SUSPENDED），而非简单地跳过或默认为 ACTIVE。
 * - checkpoint stream 应按源 V1 user_id 前进，
 *   确保断点续跑时不会重复创建成员关系。
 * - 写入时利用 (tenant_id, user_id) 唯一键实现幂等性（可重入），
 *   即使用 ON CONFLICT DO NOTHING 或 UPSERT 语义，
 *   保证重复运行不会产生重复记录。
 *
 * 【与其他组件的连接】
 * - 前置依赖：TenantMigration + UserMigration
 *   - 从 v1_tenant_id_map 读取默认租户 ID
 *   - 从 v1_user_id_map 读取 V1→V2 用户 ID 映射
 * - 下游依赖者：RolePermissionMigration 使用本任务创建的 membership 记录
 *   来建立 tenant_membership_role（用户-角色关联），
 *   需要通过 membership_id 关联到具体的成员关系
 *
 * 【Kotlin 语法要点】
 * - setOf(MigrationTaskId.TENANT, MigrationTaskId.USER)：创建包含两个元素的
 *   不可变 Set，表示本任务同时依赖 TENANT 和 USER 两个前置任务。
 *   Kotlin 的 Set 天然去重，即使重复添加同一元素也只保留一份。
 * - 构造函数参数跨多行：当参数较多或行较长时，Kotlin 习惯将参数
 *   每个占一行，末尾逗号（trailing comma）便于未来添加新参数。
 */
class MembershipMigration(
    /**
     * 任务唯一标识符：MigrationTaskId.MEMBERSHIP。
     *
     * 枚举值 cliName="membership"，用于 checkpoint 记录、CLI 参数匹配和日志输出。
     */
    id: MigrationTaskId = MigrationTaskId.MEMBERSHIP,
    /**
     * 前置依赖集合：{TENANT, USER}。
     *
     * 成员关系连接用户和租户，因此同时依赖：
     * - TenantMigration：提供默认租户 ID（v1_tenant_id_map）
     * - UserMigration：提供 V1→V2 用户 ID 映射（v1_user_id_map）
     */
    dependencies: Set<MigrationTaskId> = setOf(MigrationTaskId.TENANT, MigrationTaskId.USER),
) : PlannedMigrationTask(id, dependencies) {
    override fun execute(context: MigrationContext): TaskResult {
        val result =
            BatchProcessor().processBatches(
                context = context,
                checkpointKey = CheckpointKey(id, "tenant-membership"),
                readPage = { lastId, limit ->
                    context.source.read { dsl ->
                        val userId = DSL.field(DSL.name("id"), Long::class.javaObjectType)
                        val ids =
                            dsl.select(userId)
                                .from(DSL.table(DSL.name("user_account")))
                                .where(lastId?.let(userId::gt) ?: DSL.noCondition())
                                .orderBy(userId)
                                .limit(limit)
                                .fetch(userId)
                        BatchPage(ids, ids.lastOrNull())
                    }
                },
                transformAndWrite = { dsl, userIds ->
                    setTenantContext(dsl, context.options.defaultTenant.id)
                    val userMap = dsl.render(DSL.name(context.options.controlSchema, "v1_user_id_map"))
                    userIds.forEach { v1UserId ->
                        val inserted =
                            dsl.execute(
                                """
                                INSERT INTO tenant_membership (tenant_id, user_id, status)
                                SELECT ?, m.v2_user_id, CAST('ACTIVE' AS membership_status)
                                FROM $userMap m
                                WHERE m.v1_user_id = ?
                                ON CONFLICT (tenant_id, user_id) DO UPDATE SET
                                    status = EXCLUDED.status,
                                    updated_at = NOW()
                                """.trimIndent(),
                                context.options.defaultTenant.id,
                                v1UserId,
                            )
                        check(inserted == 1) { "Missing user ID mapping for V1 user $v1UserId" }
                    }
                    userIds.size
                },
            )
        return listOf(result).toTaskResult(id)
    }
}
