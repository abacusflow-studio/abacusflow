package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult
import org.jooq.impl.DSL

/**
 * 将 V1 user_account 迁移到 V2 user_account，并迁移关联的 external_identity。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线中"基础实体层"的第二步，负责将 V1 的用户账号数据
 * 写入 V2 的 user_account 表，同时迁移每个用户的外部身份标识
 * （external_identity，如登录凭证、OAuth 关联等）。
 * 用户是认证与授权的主体，后续的 MembershipMigration、
 * RolePermissionMigration 以及所有订单的 creator_id 都依赖本任务
 * 产出的 v1_user_id → v2_user_id 映射。
 *
 * 【V1→V2 映射要点】
 * - V1 user_account 与 V2 user_account 表结构基本一致，
 *   但 V2 新增了多租户归属（tenant_id）和更细粒度的账户状态字段。
 * - 必须建立 v1_user_id → v2_user_id 映射表，写入控制表
 *   v1_user_id_map，供下游任务（MembershipMigration、订单迁移等）查找。
 * - 当 V2 种子数据中已存在默认管理员（如 admin@abacusflow）时，
 *   必须**建立映射并复用 V2 用户 ID**，而非简单地 ON CONFLICT DO NOTHING。
 *   原因：ON CONFLICT DO NOTHING 会导致 V1 admin 用户没有映射记录，
 *   下游任务无法通过 v1_user_id_map 找到对应的 V2 用户 ID，
 *   从而丢失该用户的成员关系和角色分配。
 * - external_identity 需按已确认的映射关系迁移，
 *   确保用户登录凭证在 V2 中仍然有效。
 *
 * 【与其他组件的连接】
 * - 前置依赖：TenantMigration（用户必须归属某个租户，
 *   需要从控制表读取 v1_tenant_id_map 获取默认租户 ID）
 * - 下游依赖者：MembershipMigration 使用 v1_user_id_map
 *   查找 V2 用户 ID 以创建成员关系；RolePermissionMigration 使用
 *   v1_user_id_map 建立用户-角色关联；所有订单迁移任务使用
 *   v1_user_id_map 转换 creator_id
 * - FieldMapping.withTenantId() 为迁移后的用户记录填充 tenant_id
 *
 * 【Kotlin 语法要点】
 * - setOf(MigrationTaskId.TENANT)：创建包含单个元素的不可变 Set，
 *   表示本任务依赖 TENANT 这一个前置任务。
 *   setOf() 是 Kotlin 标准库函数，返回不可变的 Set 实例，
 *   比 mutableSetOf() 更安全（不可修改）且语义更清晰。
 * - 构造函数直接委托父类：Kotlin 中如果子类主构造函数的参数
 *   直接传给父类主构造函数，可以省略类体的大括号 {}。
 */
class UserMigration(
    /**
     * 任务唯一标识符：MigrationTaskId.USER。
     *
     * 枚举值 cliName="user"，用于 checkpoint 记录、CLI 参数匹配和日志输出。
     */
    id: MigrationTaskId = MigrationTaskId.USER,
    /**
     * 前置依赖集合：{TENANT}。
     *
     * 用户必须归属某个租户，因此依赖 TenantMigration 先完成默认租户的创建。
     * 从控制表 v1_tenant_id_map 读取 V2 租户 ID，为用户记录填充 tenant_id。
     */
    dependencies: Set<MigrationTaskId> = setOf(MigrationTaskId.TENANT),
) : PlannedMigrationTask(id, dependencies) {
    override fun execute(context: MigrationContext): TaskResult {
        val support = TableMigrationSupport()
        val userMap = DSL.table(DSL.name(context.options.controlSchema, "v1_user_id_map"))
        return listOf(
            support.migrate(
                context = context,
                taskId = id,
                stream = "user-account",
                sourceTable = "user_account",
                columns = V1V2Columns.USER_ACCOUNT,
                tenantAware = false,
                afterBatch = { dsl, rows ->
                    rows.forEach { row ->
                        dsl.insertInto(userMap)
                            .columns(DSL.field("v1_user_id"), DSL.field("v2_user_id"))
                            .values(row.id, row.id)
                            .onConflict(DSL.field("v1_user_id"))
                            .doUpdate()
                            .set(DSL.field("v2_user_id"), row.id)
                            .execute()
                    }
                },
            ),
            support.migrate(
                context = context,
                taskId = id,
                stream = "user-external-identity",
                sourceTable = "user_external_identity",
                columns = V1V2Columns.USER_EXTERNAL_IDENTITY,
                tenantAware = false,
            ),
        ).toTaskResult(id)
    }
}
