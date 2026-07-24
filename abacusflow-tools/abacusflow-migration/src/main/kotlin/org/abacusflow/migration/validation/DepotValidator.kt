package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 仓库校验器 —— 校验迁移后的仓库数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * DepotValidator 负责验证仓库迁移（DepotMigration）的结果是否正确。
 * 仓库（Depot）是库存管理中的"地点"概念，库存记录关联产品和仓库，
 * 表示"某个产品在某个仓库中有多少数量"。如果仓库数据有问题：
 * - 库存记录无法关联到正确的仓库
 * - 采购入库时无法确定目标仓库
 * - 销售出库时无法确定来源仓库
 * - 仓库数据重复导致同一物理仓库被当作多个仓库处理
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **仓库数量**：V1 源数据库的仓库总数必须与 V2 目标数据库的仓库总数
 *    完全一致。数量不匹配意味着有仓库在迁移过程中丢失或重复。
 * 2. **名称唯一性**：V2 中的仓库名称在同一租户内必须唯一。
 *    仓库名称是业务标识，重复会导致：
 *    - 用户选择仓库时产生歧义
 *    - 报表统计时同一仓库的数据被分散
 *    - 业务流程中无法确定操作的目标仓库
 * 3. **租户归属**：V2 中的每个仓库必须正确归属到某个租户。
 *    V2 采用多租户架构，仓库是租户级的资源，如果仓库没有归属到
 *    正确的租户，会导致该租户下的用户无法看到或操作这些仓库。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：DepotMigration（taskId = MigrationTaskId.DEPOT）
 * - 依赖校验器：TenantValidator（仓库必须归属某个租户）
 * - 下游校验器：InventoryValidator（库存引用仓库 ID）
 * - 在 StandardValidationPlan 中第八个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.DEPOT：将校验器与仓库迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class DepotValidator : PlannedMigrationValidator(MigrationTaskId.DEPOT)
