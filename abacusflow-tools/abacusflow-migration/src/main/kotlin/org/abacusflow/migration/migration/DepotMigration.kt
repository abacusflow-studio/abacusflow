package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult

/**
 * 将 V1 仓库（depot）迁移到 V2 depot，补填 tenant_id。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线中"业务实体层"的第二步，负责将 V1 的仓库数据
 * 迁移到 V2。仓库（depot）是库存管理的空间载体，库存记录
 * （inventory_unit）通过 depot_id 引用仓库，表示"货物存放在哪个仓库"。
 * 因此仓库必须在库存迁移之前完成，否则库存记录的外键约束会失败。
 *
 * 【V1→V2 映射要点】
 * - V1 depot 与 V2 depot 表结构基本一致，主要差异是 V2 新增了
 *   tenant_id NOT NULL 字段（多租户归属）。
 * - 迁移时需要从 v1_tenant_id_map 读取默认租户 ID，
 *   为每条仓库记录补填 tenant_id，使其满足 V2 的 NOT NULL 约束。
 * - 仓库必须在 InventoryMigration 之前迁移：
 *   inventory_unit 表有 depot_id 外键引用 depot 表，
 *   如果仓库尚未迁移，库存记录写入时会因外键约束失败。
 *   这也是 StandardMigrationPlan 中 DepotMigration 排在
 *   InventoryMigration 之前的原因。
 * - V1 的 depot.id 不能直接保留到 V2（与角色类似），
 *   需要建立 v1_depot_id_map 映射表，供 InventoryMigration
 *   和订单迁移任务使用。
 *
 * 【与其他组件的连接】
 * - 前置依赖：TenantMigration（仓库是租户级实体，
 *   需要从 v1_tenant_id_map 读取默认租户 ID）
 * - FieldMapping.withTenantId()：为迁移后的仓库记录填充 tenant_id
 * - 下游依赖者：InventoryMigration 使用 v1_depot_id_map
 *   将库存记录中的 depot_id 转换为 V2 ID；
 *   PurchaseOrderMigration 和 SaleOrderMigration 使用 v1_depot_id_map
 *   将订单中的 depot_id 转换为 V2 ID
 *
 * 【Kotlin 语法要点】
 * - setOf(MigrationTaskId.TENANT)：创建包含单个元素的不可变 Set，
 *   表示本任务仅依赖 TENANT 这一个前置任务。
 *   仓库是租户级实体，需要租户先存在，但不依赖产品或用户。
 */
class DepotMigration(
    /**
     * 任务唯一标识符：MigrationTaskId.DEPOT。
     *
     * 枚举值 cliName="depot"，用于 checkpoint 记录、CLI 参数匹配和日志输出。
     */
    id: MigrationTaskId = MigrationTaskId.DEPOT,
    /**
     * 前置依赖集合：{TENANT}。
     *
     * 仓库是租户级实体，必须归属某个租户。
     * 从 v1_tenant_id_map 读取默认租户 ID，为记录填充 tenant_id。
     */
    dependencies: Set<MigrationTaskId> = setOf(MigrationTaskId.TENANT),
) : PlannedMigrationTask(id, dependencies) {
    override fun execute(context: MigrationContext): TaskResult =
        listOf(
            TableMigrationSupport().migrate(
                context = context,
                taskId = id,
                stream = "depot",
                sourceTable = "depot",
                columns = V1V2Columns.DEPOT,
            ),
        ).toTaskResult(id)
}
