package org.abacusflow.migration.validation

/**
 * 标准校验计划 —— 校验器注册清单。
 *
 * 【设计目的与迁移管线中的角色】
 * StandardValidationPlan 是迁移校验管线的"总蓝图"，定义了从 V1 到 V2
 * 全量迁移后需要执行的所有校验器及其执行顺序。它与 StandardMigrationPlan
 * 形成对称设计：
 * - StandardMigrationPlan 定义"迁移什么"（MigrationTask 列表）
 * - StandardValidationPlan 定义"校验什么"（MigrationValidator 列表）
 *
 * 校验器列表的顺序与迁移任务的执行顺序一致，遵循数据依赖关系：
 * 先校验基础实体（租户、用户），再校验依赖基础实体的关联实体，
 * 最后校验收尾结果。这保证了校验时所有前置数据已经验证正确。
 *
 * 【校验内容】
 * 本对象本身不执行校验，而是注册所有校验器实例。
 * 每个校验器负责校验对应迁移任务的结果，详见各校验器的 KDoc。
 *
 * 【与 MigrationPlan 的一一对应约束】
 * **重要**：StandardValidationPlan.create() 返回的校验器列表中的 taskId
 * 必须与 StandardMigrationPlan.create() 返回的迁移任务列表中的 id
 * 形成一一对应关系。即：
 * - 每个迁移任务都有对应的校验器
 * - 每个校验器都有对应的迁移任务
 * - 没有遗漏的迁移任务（缺少校验器）
 * - 没有多余的校验器（没有对应的迁移任务）
 *
 * 实现校验 Runner 时应验证这一约束，例如：
 * - 比较两个列表的 taskId 集合是否完全相同
 * - 如果发现不匹配，在启动时抛出异常而非静默忽略
 *
 * 【与其他组件的连接】
 * - DefaultMigrationApplication.validate() 调用 create() 获取校验器列表
 * - 校验 Runner 接收校验器列表，依次调用各校验器的 validate 方法
 * - 每个校验器实例都是 PlannedMigrationValidator 的子类
 * - StandardMigrationPlan 定义了对应的迁移计划（迁移任务列表）
 *
 * 【Kotlin 语法要点】
 * - object：单例对象，保证全局只有一个校验计划定义，避免多处定义导致不一致
 * - fun create(): List<MigrationValidator>：工厂方法，每次调用创建新的校验器实例列表，
 *   避免多次运行共享同一实例导致状态污染
 * - listOf()：创建不可变列表，保证校验器顺序在创建后不可修改
 * - List<MigrationValidator>：返回接口类型列表，调用方只依赖接口不依赖实现
 */
object StandardValidationPlan {
    /**
     * 创建标准全量校验计划的校验器列表。
     *
     * 【为什么每次调用都创建新实例】
     * 返回新的校验器实例列表而非复用单例，是因为每次校验运行
     * 需要独立的校验器实例：
     * - 校验器可能持有运行时状态（如已检查的记录数、发现的违规项）
     * - 多次运行共享实例会导致状态混乱
     * - 支持并行运行多个校验实例（不同 runId）
     *
     * 【校验器注册顺序与依赖层次】
     * 列表顺序与 StandardMigrationPlan 中的任务顺序一致，
     * 遵循数据依赖关系，按层次组织：
     * 1. 基础实体层：TenantValidator → UserValidator → MembershipValidator
     * 2. 授权层：RoleValidator → PermissionValidator → RolePermissionValidator
     * 3. 产品与库存层：ProductValidator → DepotValidator → InventoryValidator
     * 4. 采购交易层：SupplierValidator → PurchaseOrderValidator → PurchaseOrderItemValidator
     * 5. 销售交易层：CustomerValidator → SaleOrderValidator → SaleOrderItemValidator
     * 6. 收尾层：FinalizeValidator
     *
     * @return 包含所有校验器的新列表
     */
    fun create(): List<MigrationValidator> =
        listOf(
            // ===== 第一层：基础实体 =====
            // 租户校验：默认租户唯一、状态正确、tenant_placement 有效
            TenantValidator(),
            // 用户和授权数据未从 V1 迁移，不做源/目标数量对比。
            // ===== 第三层：产品与库存 =====
            // 产品校验：分类树、产品数量、ID/条码集合、引用完整性
            ProductValidator(),
            // 仓库校验：仓库数量、名称唯一、租户归属
            DepotValidator(),
            // ===== 第四层：采购交易 =====
            // 供应商校验：供应商数量、名称唯一、租户归属
            SupplierValidator(),
            // 采购订单校验：订单数量、状态分布、供应商引用
            PurchaseOrderValidator(),
            // 采购明细校验：明细数量、金额聚合、产品引用
            PurchaseOrderItemValidator(),
            // 库存校验：库存单元依赖采购链，放在采购校验之后
            InventoryValidator(),
            // ===== 第五层：销售交易 =====
            // 客户校验：客户数量、名称唯一、租户归属
            CustomerValidator(),
            // 销售订单校验：订单数量、状态分布、客户引用
            SaleOrderValidator(),
            // 销售明细校验：明细数量、金额聚合、库存单元引用
            SaleOrderItemValidator(),
            // ===== 第六层：收尾 =====
            // 收尾校验：序列 next value > max ID、汇总所有结果
            FinalizeValidator(),
        )
}
