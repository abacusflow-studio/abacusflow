package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult

/**
 * 创建 V2 默认租户（tenant）与租户安置记录（tenant_placement）。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是整个迁移管线的根节点——V2 引入了多租户架构，所有业务实体
 * （用户、产品、仓库、订单等）都必须归属某个租户，因此在迁移任何
 * 业务数据之前，必须先确保 V2 中已存在一个可用的默认租户。
 * 本任务负责在 V2 中创建（或复用）这个默认租户，并写入 tenant_placement
 * 记录以标记租户的部署状态。
 *
 * 【V1→V2 映射要点】
 * - V1 是单租户架构，所有数据天然属于"一个隐式租户"，没有 tenant 表。
 * - V2 引入了显式的 tenant + tenant_placement 表，每个业务表都新增了
 *   tenant_id NOT NULL 外键。
 * - 迁移时需要为 V1 的全部数据创建一个默认租户（通常 id=1），
 *   但 V2 的种子数据（seed data）可能已经预置了 id=1 的租户。
 * - 实现时必须检测 ID=1 是否已被 V2 种子数据占用：
 *   - 若已占用且名称匹配 → 复用该租户，建立 V1→V2 映射
 *   - 若已占用但名称冲突 → 报错或选择下一个可用 ID
 *   - 若未占用 → 创建默认租户
 *   - 绝不能盲目覆盖（OVERWRITE）已有租户数据
 *
 * 【与其他组件的连接】
 * - 无前置依赖（emptySet()）：本任务是迁移管线的根节点，
 *   所有其他任务都直接或间接依赖本任务的输出
 * - 本任务创建的 tenant_id 会被写入控制表（v1_tenant_id_map），
 *   供 UserMigration、ProductMigration、DepotMigration 等下游任务读取
 * - FieldMapping.withTenantId() 使用本任务产出的 tenant_id
 *   为所有 V2 业务记录填充租户归属
 *
 * 【Kotlin 语法要点】
 * - class TenantMigration : PlannedMigrationTask(...)：类的唯一构造函数
 *   直接调用父类 PlannedMigrationTask 的主构造函数，无需显式 super()
 * - emptySet()：Kotlin 标准库函数，创建一个不可变的空 Set，
 *   语义上表示"本任务没有任何前置依赖"，比 setOf() 更清晰地表达空集意图
 * - MigrationTaskId.TENANT：枚举值，作为本任务的全局唯一标识符，
 *   会持久化到 checkpoint/error 表中，发布后不应改名
 */
class TenantMigration(
    /**
     * 任务唯一标识符：MigrationTaskId.TENANT。
     *
     * 枚举值 cliName="tenant"，用于 checkpoint 记录、CLI 参数匹配和日志输出。
     * 通过 final override（在父类中声明）确保子类构造后不可更改。
     */
    id: MigrationTaskId = MigrationTaskId.TENANT,
    /**
     * 前置依赖集合：空集。
     *
     * TenantMigration 是迁移管线的根节点，没有前置依赖。
     * 所有其他迁移任务都直接或间接依赖本任务。
     */
    dependencies: Set<MigrationTaskId> = emptySet(),
) : PlannedMigrationTask(id, dependencies) {
    override fun execute(context: MigrationContext): TaskResult {
        val tenant = context.options.defaultTenant
        context.target.transaction { dsl ->
            val nameAtConfiguredId =
                dsl.fetchValue("SELECT name FROM tenant WHERE id = ?", tenant.id, String::class.java)
            check(nameAtConfiguredId == null || nameAtConfiguredId == tenant.name) {
                "Target tenant id ${tenant.id} is already used by '$nameAtConfiguredId'"
            }
            val idForConfiguredName =
                dsl.fetchValue("SELECT id FROM tenant WHERE name = ?", tenant.name, Long::class.java)
            check(idForConfiguredName == null || idForConfiguredName == tenant.id) {
                "Target tenant '${tenant.name}' already exists with id $idForConfiguredName, expected ${tenant.id}"
            }
            dsl.execute(
                """
                INSERT INTO tenant (id, name, display_name, status)
                VALUES (?, ?, ?, CAST('ACTIVE' AS tenant_status))
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    display_name = EXCLUDED.display_name,
                    status = EXCLUDED.status,
                    updated_at = NOW()
                """.trimIndent(),
                tenant.id,
                tenant.name,
                tenant.displayName,
            )
            dsl.execute(
                """
                INSERT INTO tenant_placement (tenant_id, cell_id, storage_mode)
                VALUES (?, 'cell-default-01', CAST('SHARED_CELL' AS tenant_storage_mode))
                ON CONFLICT (tenant_id) DO UPDATE SET
                    cell_id = EXCLUDED.cell_id,
                    storage_mode = EXCLUDED.storage_mode,
                    updated_at = NOW()
                """.trimIndent(),
                tenant.id,
            )
        }
        return TaskResult(taskId = id, processedCount = 1)
    }
}
