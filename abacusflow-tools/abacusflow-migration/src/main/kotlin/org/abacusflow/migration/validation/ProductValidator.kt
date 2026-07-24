package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 产品校验器 —— 校验迁移后的产品及分类数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * ProductValidator 负责验证产品迁移（ProductMigration）的结果是否正确。
 * 产品是库存管理系统的核心实体，所有库存记录、采购订单、销售订单
 * 都引用产品。如果产品数据有问题，会导致：
 * - 库存记录无法关联到正确的产品
 * - 采购/销售订单中的产品信息错误
 * - 产品分类体系混乱，影响产品检索和统计
 *
 * 【校验内容】
 * 本校验器需要验证以下四个方面：
 * 1. **分类树**：V2 中的产品分类树（category tree）必须与 V1 的分类结构
 *    一致。分类树是产品的组织结构，通常是无根节点的森林结构（租户级）。
 *    校验时需要确认：
 *    - 分类节点的父子关系正确（parentId 指向存在的父分类）
 *    - 不存在环路（分类 A 的父分类是 B，B 的父分类又是 A）
 *    - 分类层级深度合理
 * 2. **产品数量**：V1 源数据库的产品总数必须与 V2 目标数据库的产品总数
 *    完全一致。数量不匹配意味着有产品在迁移过程中丢失或重复。
 * 3. **ID/条码集合**：比较 V1 和 V2 的产品 ID 集合和条码（barcode）集合，
 *    确保所有 V1 产品的 ID 和条码在 V2 中都有对应记录。
 *    条码是产品的业务标识，条码缺失会导致扫码入库等业务流程失败。
 * 4. **所有 category/tenant 引用完整性**：
 *    - 产品的 categoryId 必须指向 V2 中已存在的分类
 *    - 产品的 tenantId 必须指向 V2 中已存在的租户
 *    - 分类的 tenantId 必须指向 V2 中已存在的租户
 *    引用完整性是数据一致性的基础，违反引用完整性的记录
 *    会导致查询异常、外键约束冲突等问题。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：ProductMigration（taskId = MigrationTaskId.PRODUCT）
 * - 依赖校验器：TenantValidator（产品和分类都归属某个租户）
 * - 下游校验器：InventoryValidator（库存引用产品 ID）
 * - 在 StandardValidationPlan 中第七个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.PRODUCT：将校验器与产品迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class ProductValidator : PlannedMigrationValidator(MigrationTaskId.PRODUCT)
