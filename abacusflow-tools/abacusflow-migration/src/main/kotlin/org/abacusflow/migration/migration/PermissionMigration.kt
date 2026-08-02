package org.abacusflow.migration.migration

import org.abacusflow.migration.checkpoint.CheckpointKey
import org.abacusflow.migration.framework.BatchPage
import org.abacusflow.migration.framework.BatchProcessor
import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import org.abacusflow.migration.migration.mapping.PermissionMapping
import org.jooq.impl.DSL
import java.time.Instant

/**
 * 将 V1 permission 迁移到 V2 permission，建立 v1_permission_id_map 映射表。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线中"权限体系层"的第二步，负责将 V1 的权限定义
 * 映射到 V2 的权限体系。V2 对权限体系进行了重大升级——引入了
 * scope（作用域）层级，权限命名从两段式升级为三段式。
 * 本任务需要确保每条 V1 权限记录都能准确对应到 V2 中已存在的
 * 种子权限（seed permission），并建立 v1_permission_id_map 映射表
 * 供下游的 RolePermissionMigration 使用。
 *
 * 【V1→V2 映射要点】
 * - V1 权限命名：{resource}:{action}（如 product:read），
 *   扁平结构，所有权限在同一层级，无租户隔离概念。
 * - V2 权限命名：{scope}:{resource}:{action}（如 business:product:read），
 *   三段式结构，scope 区分权限所属层级，支持多租户隔离。
 * - V1 没有 scope 列，V2 新增了 scope 列，取值为
 *   PLATFORM / TENANT / BUSINESS 三种：
 *   - PLATFORM：平台级权限（user/role/permission/tenant 资源），
 *     涉及跨租户的系统管理功能
 *   - TENANT：租户级权限（tenant 内部管理，如成员管理、角色分配），
 *     V1 中可能没有直接对应的权限
 *   - BUSINESS：业务级权限（product/inventory/order/depot 等资源），
 *     对应 V1 中除平台管理外的所有权限
 * - 使用 PermissionMapping.V1_TO_V2_NAME 进行权限名映射：
 *   该映射表基于 V2 种子数据（51 个权限），采用"白名单"策略，
 *   只匹配 V2 已有权限，无匹配的 V1 权限标记为 unmapped。
 * - 使用 PermissionMapping.inferScope() 推断 scope：
 *   从 V1 权限名中提取 resource 部分，根据 resource 名称判断
 *   所属 scope（user/role/permission/tenant → PLATFORM，其他 → BUSINESS）。
 * - 禁止仅按数字 ID 关联：V1 的 permission.id 不能直接作为 V2 的 ID，
 *   必须通过名称映射找到 V2 对应权限，再获取 V2 的 ID。
 *
 * 【与其他组件的连接】
 * - 前置依赖：RoleMigration（权限迁移依赖角色先完成，
 *   因为 V2 的权限体系与角色紧密关联，且 PermissionMapping 的
 *   scope 推断需要参考角色映射结果）
 * - PermissionMapping：核心映射策略组件，提供 V1_TO_V2_NAME 映射表
 *   和 inferScope() 方法
 * - 下游依赖者：RolePermissionMigration 使用 v1_permission_id_map
 *   将 V1 角色-权限关联中的权限 ID 转换为 V2 ID
 *
 * 【Kotlin 语法要点】
 * - setOf(MigrationTaskId.ROLE)：创建包含单个元素的不可变 Set，
 *   表示本任务依赖 ROLE 这一个前置任务。
 *   权限迁移依赖角色迁移完成，因为 V2 权限体系与角色紧密关联。
 */
class PermissionMigration(
    /**
     * 任务唯一标识符：MigrationTaskId.PERMISSION。
     *
     * 枚举值 cliName="permission"，用于 checkpoint 记录、CLI 参数匹配和日志输出。
     */
    id: MigrationTaskId = MigrationTaskId.PERMISSION,
    /**
     * 前置依赖集合：{ROLE}。
     *
     * 权限迁移依赖角色迁移完成。V2 的权限体系与角色紧密关联，
     * 且 PermissionMapping 的 scope 推断需要参考角色映射结果。
     * 从 v1_role_id_map 可间接确认租户 ID（角色归属租户）。
     */
    dependencies: Set<MigrationTaskId> = setOf(MigrationTaskId.ROLE),
) : PlannedMigrationTask(id, dependencies) {
    override fun execute(context: MigrationContext): TaskResult {
        val result =
            BatchProcessor().processBatches(
                context = context,
                checkpointKey = CheckpointKey(id, "permission"),
                readPage = { lastId, limit ->
                    context.source.read { dsl ->
                        val permissionId = DSL.field("id", Long::class.javaObjectType)
                        val rows =
                            dsl.select(
                                permissionId,
                                DSL.field("name", String::class.java),
                                DSL.field("label", String::class.java),
                                DSL.field("description", String::class.java),
                                DSL.field("created_at", Instant::class.java),
                                DSL.field("updated_at", Instant::class.java),
                            ).from(DSL.table(DSL.name("permission")))
                                .where(lastId?.let(permissionId::gt) ?: DSL.noCondition())
                                .orderBy(permissionId)
                                .limit(limit)
                                .fetch { record ->
                                    PermissionRow(
                                        id = requireNotNull(record.value1()),
                                        name = requireNotNull(record.value2()),
                                        label = record.value3(),
                                        description = record.value4(),
                                        createdAt = requireNotNull(record.value5()),
                                        updatedAt = requireNotNull(record.value6()),
                                    )
                                }
                        BatchPage(rows, rows.lastOrNull()?.id)
                    }
                },
                transformAndWrite = { dsl, rows ->
                    val permissionMap = dsl.render(DSL.name(context.options.controlSchema, "v1_permission_id_map"))
                    rows.forEach { row ->
                        val mappedName = resolvePermissionName(row.name)
                        val scope = mappedName.substringBefore(':').uppercase()
                        check(scope in setOf("PLATFORM", "TENANT", "BUSINESS")) {
                            "Cannot infer V2 permission scope for '${row.name}'"
                        }
                        val record =
                            dsl.fetchOne(
                                """
                                INSERT INTO permission (name, label, description, scope, created_at, updated_at)
                                VALUES (?, ?, ?, ?, CAST(? AS timestamptz), CAST(? AS timestamptz))
                                ON CONFLICT (name) DO UPDATE SET
                                    label = EXCLUDED.label,
                                    description = EXCLUDED.description,
                                    scope = EXCLUDED.scope,
                                    updated_at = EXCLUDED.updated_at
                                RETURNING id
                                """.trimIndent(),
                                mappedName,
                                row.label ?: row.name,
                                row.description,
                                scope,
                                row.createdAt,
                                row.updatedAt,
                            )
                        val v2Id = requireNotNull(record?.get("id", Long::class.java))
                        dsl.execute(
                            """
                            INSERT INTO $permissionMap (v1_permission_id, v2_permission_id)
                            VALUES (?, ?)
                            ON CONFLICT (v1_permission_id) DO UPDATE SET v2_permission_id = EXCLUDED.v2_permission_id
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

    private fun resolvePermissionName(v1Name: String): String {
        PermissionMapping.mapPermissionName(v1Name)?.let { return it }
        val prefix = v1Name.substringBefore(':').uppercase()
        if (prefix in setOf("PLATFORM", "TENANT", "BUSINESS")) return v1Name
        return "${PermissionMapping.inferScope(v1Name).lowercase()}:$v1Name"
    }

    private data class PermissionRow(
        val id: Long,
        val name: String,
        val label: String?,
        val description: String?,
        val createdAt: Instant,
        val updatedAt: Instant,
    )
}
