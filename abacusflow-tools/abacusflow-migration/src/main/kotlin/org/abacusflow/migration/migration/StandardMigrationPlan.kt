package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationPlan

/**
 * 标准全量迁移计划的唯一注册位置；列表顺序与固定执行顺序一致。
 *
 * 【设计目的与迁移管线中的角色】
 * 本对象是迁移管线的"总蓝图"——定义了从 V1 到 V2 全量迁移时
 * 需要执行的所有任务及其执行顺序。它是整个迁移流程的入口点，
 * DefaultMigrationApplication 通过调用 create() 获取完整的迁移计划，
 * 然后交给 MigrationRunner 执行。
 *
 * 【任务执行顺序的设计原则】
 * 列表中的顺序即为任务的固定执行顺序，这个顺序不是随意的，
 * 而是严格遵循数据依赖关系：
 * 1. 先迁移基础实体（租户、用户），再迁移依赖基础实体的关联实体
 * 2. 先迁移独立实体（产品、仓库），再迁移关联实体（库存、订单）
 * 3. 最后执行收尾任务（FinalizeMigration），完成数据一致性校验和清理
 *
 * 虽然每个任务也通过 dependencies 属性声明了依赖关系（由 MigrationRunner 解析），
 * 但列表顺序作为"默认执行顺序"提供了额外的保障：
 * - 当依赖图为线性时，直接按列表顺序执行，无需拓扑排序
 * - 当依赖图有分支时，MigrationRunner 会根据 dependencies 做拓扑排序
 *
 * 【各任务的职责与依赖关系】
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 第一层：基础实体（无前置依赖）                                    │
 * │  TenantMigration   → 创建 V2 租户，建立 V1→V2 租户映射          │
 * │  UserMigration     → 迁移用户账号，依赖 TenantMigration          │
 * │  MembershipMigration → 迁移用户-租户成员关系，依赖 Tenant+User    │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 第二层：权限体系（依赖基础实体）                                   │
 * │  RoleMigration         → 迁移角色，依赖 TenantMigration          │
 * │  PermissionMigration   → 迁移权限，依赖 TenantMigration          │
 * │  RolePermissionMigration → 迁移角色-权限关联，依赖 Role+Permission│
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 第三层：业务实体（依赖基础实体和权限体系）                          │
 * │  ProductMigration      → 迁移产品，依赖 TenantMigration          │
 * │  DepotMigration        → 迁移仓库，依赖 TenantMigration          │
 * │  InventoryMigration    → 迁移库存，依赖 Product+Depot             │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 第四层：业务关联实体（依赖业务实体）                                │
 * │  SupplierMigration         → 迁移供应商，依赖 TenantMigration     │
 * │  PurchaseOrderMigration    → 迁移采购订单，依赖 Supplier+Depot    │
 * │  PurchaseOrderItemMigration → 迁移采购订单明细，依赖 PurchaseOrder │
 * │  CustomerMigration         → 迁移客户，依赖 TenantMigration       │
 * │  SaleOrderMigration        → 迁移销售订单，依赖 Customer+Depot    │
 * │  SaleOrderItemMigration    → 迁移销售订单明细，依赖 SaleOrder      │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 第五层：收尾                                                    │
 * │  FinalizeMigration → 数据一致性校验、清理临时数据、释放锁          │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * 【与其他组件的连接】
 * - DefaultMigrationApplication.migrate() 调用 create() 获取计划
 * - MigrationRunner 接收 MigrationPlan，解析依赖图，按拓扑顺序执行任务
 * - 每个任务实例都是 PlannedMigrationTask 的子类
 * - StandardValidationPlan 定义了对应的验证计划（验证迁移结果的正确性）
 *
 * 【Kotlin 语法要点】
 * - object：单例对象，保证全局只有一个迁移计划定义，避免多处定义导致不一致
 * - fun create(): MigrationPlan：工厂方法，每次调用创建新的 MigrationPlan 实例
 *   （包含新的任务实例列表），避免多次运行共享同一实例导致状态污染
 * - listOf()：创建不可变列表，保证任务顺序在创建后不可修改
 * - MigrationPlan：框架层的数据类，包装任务列表，提供依赖解析等能力
 */
object StandardMigrationPlan {
    /**
     * 创建标准全量迁移计划。
     *
     * 【为什么每次调用都创建新实例】
     * 返回新的 MigrationPlan（包含新的任务实例列表）而非复用单例，
     * 是因为每次迁移运行需要独立的任务实例：
     * - 任务可能持有运行时状态（如已处理记录数、检查点位置）
     * - 多次运行共享实例会导致状态混乱
     * - 支持并行运行多个迁移实例（不同 runId）
     *
     * @return 包含所有迁移任务的新 MigrationPlan 实例
     */
    fun create(): MigrationPlan =
        MigrationPlan(
            listOf(
                // ===== 第一层：基础实体 =====
                // 租户是 V2 多租户架构的根基，必须最先创建
                TenantMigration(),
                // 用户迁移依赖租户（每个用户必须归属某个租户）
                UserMigration(),
                // 成员关系迁移依赖租户和用户（建立用户与租户的归属关系）
                MembershipMigration(),
                // ===== 第二层：权限体系 =====
                // 角色迁移依赖租户（V2 角色是租户级的 tenant_role）
                RoleMigration(),
                // 权限迁移依赖租户（V2 权限按租户分配）
                PermissionMigration(),
                // 角色-权限关联依赖角色和权限都已迁移完成
                RolePermissionMigration(),
                // ===== 第三层：业务实体 =====
                // 产品迁移依赖租户（V2 产品是租户级的）
                ProductMigration(),
                // 仓库迁移依赖租户（V2 仓库是租户级的）
                DepotMigration(),
                // 库存迁移依赖产品和仓库（库存记录引用产品 ID 和仓库 ID）
                InventoryMigration(),
                // ===== 第四层：业务关联实体 =====
                // 供应商迁移依赖租户
                SupplierMigration(),
                // 采购订单迁移依赖供应商和仓库
                PurchaseOrderMigration(),
                // 采购订单明细迁移依赖采购订单（明细是订单的子项）
                PurchaseOrderItemMigration(),
                // 客户迁移依赖租户
                CustomerMigration(),
                // 销售订单迁移依赖客户和仓库
                SaleOrderMigration(),
                // 销售订单明细迁移依赖销售订单（明细是订单的子项）
                SaleOrderItemMigration(),
                // ===== 第五层：收尾 =====
                // 最终校验和清理，依赖所有前置任务完成
                FinalizeMigration(),
            ),
        )
}
