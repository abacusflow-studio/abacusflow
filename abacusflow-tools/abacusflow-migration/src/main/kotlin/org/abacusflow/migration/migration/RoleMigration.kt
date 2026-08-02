package org.abacusflow.migration.migration

import org.abacusflow.migration.checkpoint.CheckpointKey
import org.abacusflow.migration.framework.BatchPage
import org.abacusflow.migration.framework.BatchProcessor
import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import org.jooq.impl.DSL
import java.time.Instant

/**
 * 将 V1 role 迁移到 V2 tenant_role，建立 v1_role_id_map 映射表。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线中"权限体系层"的第一步，负责将 V1 的全局角色
 * 转换为 V2 的租户级角色（tenant_role）。V2 的多租户架构要求角色
 * 必须归属某个租户，因此 V1 的全局角色需要挂载到默认租户下。
 * 本任务还负责建立 v1_role_id → v2_role_id 的映射表，
 * 供下游的 RolePermissionMigration 和 MembershipMigration 使用。
 *
 * 【V1→V2 映射要点】
 * - V1 的 role.id **不能直接保留**到 V2——V2 的 tenant_role 使用独立的
 *   ID 生成策略，所有角色 ID 必须通过 v1_role_id_map 映射表转换。
 *   原因：V2 的 tenant_role 表可能有种子数据（seed data）已占用了
 *   某些 ID 值，直接保留 V1 ID 可能导致主键冲突。
 * - V2 预置了三个系统角色：admin（管理员）、reader（只读用户）、
 *   operator（操作员），由种子数据脚本初始化。
 *   当 V1 角色名与 V2 预置角色名相同时，通过 RoleMapping.mapRoleName()
 *   映射到 V2 已有角色行，复用其 ID，不创建新行。
 *   当 V1 角色名不在预置列表中时，创建新的 tenant_role 行，
 *   V2 分配新 ID，并写入 v1_role_id_map。
 * - 这种"预置角色复用 + 自定义角色新建"的策略确保：
 *   1. V2 的系统角色不被重复创建，权限体系保持一致
 *   2. V1 的自定义角色得以保留，业务连续性不受影响
 *
 * 【与其他组件的连接】
 * - 前置依赖：TenantMigration（角色必须归属某个租户，
 *   需要从 v1_tenant_id_map 读取默认租户 ID）
 * - RoleMapping：核心映射策略组件，提供 V2_PRESET_ROLE_NAMES 集合
 *   和 mapRoleName() 方法，决定每条 V1 角色记录是复用还是新建
 * - 下游依赖者：RolePermissionMigration 使用 v1_role_id_map
 *   将 V1 角色-权限关联中的角色 ID 转换为 V2 ID；
 *   MembershipMigration / RolePermissionMigration 使用 v1_role_id_map
 *   建立用户-角色关联
 *
 * 【Kotlin 语法要点】
 * - setOf(MigrationTaskId.TENANT)：创建包含单个元素的不可变 Set，
 *   表示本任务仅依赖 TENANT 这一个前置任务。
 *   角色属于租户级实体，需要租户先存在，但不依赖用户迁移。
 */
class RoleMigration(
    /**
     * 任务唯一标识符：MigrationTaskId.ROLE。
     *
     * 枚举值 cliName="role"，用于 checkpoint 记录、CLI 参数匹配和日志输出。
     */
    id: MigrationTaskId = MigrationTaskId.ROLE,
    /**
     * 前置依赖集合：{TENANT}。
     *
     * V2 角色是租户级实体（tenant_role），必须归属某个租户。
     * 从 v1_tenant_id_map 读取默认租户 ID，为角色记录填充 tenant_id。
     */
    dependencies: Set<MigrationTaskId> = setOf(MigrationTaskId.TENANT),
) : PlannedMigrationTask(id, dependencies) {
    override fun execute(context: MigrationContext): TaskResult {
        val result =
            BatchProcessor().processBatches(
                context = context,
                checkpointKey = CheckpointKey(id, "tenant-role"),
                readPage = { lastId, limit ->
                    context.source.read { dsl ->
                        val roleId = DSL.field("id", Long::class.javaObjectType)
                        val rows =
                            dsl.select(
                                roleId,
                                DSL.field("name", String::class.java),
                                DSL.field("label", String::class.java),
                                DSL.field("created_at", Instant::class.java),
                                DSL.field("updated_at", Instant::class.java),
                            ).from(DSL.table(DSL.name("role")))
                                .where(lastId?.let(roleId::gt) ?: DSL.noCondition())
                                .orderBy(roleId)
                                .limit(limit)
                                .fetch { record ->
                                    RoleRow(
                                        id = requireNotNull(record.value1()),
                                        name = requireNotNull(record.value2()),
                                        label = record.value3(),
                                        createdAt = requireNotNull(record.value4()),
                                        updatedAt = requireNotNull(record.value5()),
                                    )
                                }
                        BatchPage(rows, rows.lastOrNull()?.id)
                    }
                },
                transformAndWrite = { dsl, rows ->
                    setTenantContext(dsl, context.options.defaultTenant.id)
                    val roleMap = dsl.render(DSL.name(context.options.controlSchema, "v1_role_id_map"))
                    rows.forEach { row ->
                        val v2Name =
                            org.abacusflow.migration.migration.mapping.RoleMapping.mapRoleName(row.name)
                                ?: org.abacusflow.migration.migration.mapping.RoleMapping.resolveV2RoleName(row.name)
                        val record =
                            dsl.fetchOne(
                                """
                                INSERT INTO tenant_role (name, label, tenant_id, created_at, updated_at)
                                VALUES (?, ?, ?, CAST(? AS timestamptz), CAST(? AS timestamptz))
                                ON CONFLICT (tenant_id, name) DO UPDATE SET
                                    label = EXCLUDED.label,
                                    updated_at = EXCLUDED.updated_at
                                RETURNING id
                                """.trimIndent(),
                                v2Name,
                                row.label,
                                context.options.defaultTenant.id,
                                row.createdAt,
                                row.updatedAt,
                            )
                        val v2Id = requireNotNull(record?.get("id", Long::class.java))
                        dsl.execute(
                            """
                            INSERT INTO $roleMap (v1_role_id, v2_role_id)
                            VALUES (?, ?)
                            ON CONFLICT (v1_role_id) DO UPDATE SET v2_role_id = EXCLUDED.v2_role_id
                            """.trimIndent(),
                            row.id,
                            v2Id,
                        )
                    }
                    rows.size
                },
            )
        return listOf(result).toTaskResult(id)
    }

    private data class RoleRow(
        val id: Long,
        val name: String,
        val label: String?,
        val createdAt: Instant,
        val updatedAt: Instant,
    )
}
