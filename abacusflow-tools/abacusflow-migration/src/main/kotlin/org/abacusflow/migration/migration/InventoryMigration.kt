package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 依次迁移 inventory 与 inventory_unit 两张表，并为所有记录补 tenant_id。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线"第三层：业务实体"的核心环节，负责将 V1 的库存数据
 * 迁移到 V2 的多租户库存体系。库存是连接"产品"与"仓库"的枢纽实体：
 * - inventory 记录某产品在某仓库中的总体存量（总数量、冻结数量、总金额）
 * - inventory_unit 记录该库存下的具体库位单元（批次、数量、单价）
 * 两张表必须按先 inventory 后 inventory_unit 的顺序写入，因为 inventory_unit
 * 通过外键引用 inventory 的主键。
 *
 * 【V1→V2 映射要点】
 * 1. 补 tenant_id：V1 无多租户概念，所有库存记录需关联到 V2 默认租户
 * 2. 数量与金额的类型约束：V1 中可能使用 Double 存储数量和金额，
 *    V2 严格要求 Long（数量）和 BigDecimal（金额），**绝对禁止使用 Double**，
 *    因为浮点数存在精度丢失，在财务场景中不可接受
 * 3. 写入后校验：每批 inventory/inventory_unit 写入后，必须校验：
 *    - 总 quantity = 各 inventory_unit 的 quantity 之和
 *    - 总 frozen_quantity 不超过总 quantity
 *    - 总金额 = 各 inventory_unit 的金额之和
 *    校验失败应中断迁移并报告不一致的记录
 * 4. ID 映射：inventory 引用 product_id（需通过 v1_product_id_map 转换），
 *    inventory_unit 引用 depot_id（需通过 v1_depot_id_map 转换）
 *
 * 【与其他组件的连接】
 * - 依赖 PRODUCT 任务：inventory.product_id 引用产品，产品必须先迁移完成
 * - 依赖 DEPOT 任务：inventory_unit.depot_id 引用仓库，仓库必须先迁移完成
 * - 被依赖：SaleOrderMigration 依赖本任务，因为销售订单的明细会扣减库存单元
 * - 映射组件：需使用 v1_product_id_map 和 v1_depot_id_map 进行外键 ID 转换
 * - 检查点：inventory 和 inventory_unit 应使用独立的 checkpoint stream，
 *   以便断点续传时分别追踪进度
 *
 * 【Kotlin 语法要点】
 * - class : PlannedMigrationTask(...)：Kotlin 的类继承与主构造函数委托，
 *   冒号后跟基类并直接在括号中传递构造参数，等价于 Java 的 super(id, deps)
 * - setOf()：创建不可变 Set，Kotlin 标准库函数，返回 Set<T> 而非 MutableSet，
 *   保证依赖集合在构造后不可修改，语义上比 listOf 更准确（依赖无序且去重）
 * - MigrationTaskId.INVENTORY：枚举值，作为任务的唯一标识符，
 *   会被持久化到 checkpoint/error 表中
 */
class InventoryMigration :
    PlannedMigrationTask(
        /** 任务唯一标识符，对应 MigrationTaskId.INVENTORY，持久化到检查点和错误记录中。 */
        MigrationTaskId.INVENTORY,
        /**
         * 前置依赖集合：PRODUCT（inventory 引用 product_id）和 DEPOT（inventory_unit 引用 depot_id）。
         * 只有产品和仓库都迁移完成后，库存才能正确写入外键引用。
         */
        setOf(MigrationTaskId.PRODUCT, MigrationTaskId.DEPOT),
    )
