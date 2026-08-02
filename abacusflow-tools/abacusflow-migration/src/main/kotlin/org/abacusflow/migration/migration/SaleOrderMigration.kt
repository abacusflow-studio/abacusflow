package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult

/**
 * 迁移销售订单（sale_order）表，并为所有记录补 tenant_id。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线"第四层：业务关联实体"的销售链核心环节，负责将 V1 的销售订单
 * 迁移到 V2 的多租户体系。销售订单是销售链的中间实体——上游关联客户（知道卖给谁），
 * 下游被销售订单明细引用，同时销售明细会扣减库存单元。因此销售订单必须在客户和
 * 库存之后、销售订单明细之前迁移。
 *
 * 【V1→V2 映射要点】
 * 1. 补 tenant_id：V1 无多租户概念，所有销售订单记录需关联到 V2 默认租户
 * 2. 外键转换：customer_id 需通过 v1_customer_id_map 转换为 V2 ID，
 *   确保引用的客户在 V2 中已存在
 * 3. ID 映射：如果 V2 不保留原 ID，需通过 v1_sale_order_id_map 建立 ID 映射，
 *   后续 SaleOrderItemMigration 引用 order_id 时需查此映射表
 * 4. 订单状态映射：V1 的订单状态枚举值需映射到 V2 的状态枚举，
 *   需确认状态语义完全对齐，不存在 V1 有而 V2 无的状态
 * 5. 库存关联：销售订单本身不直接引用库存，但其明细（sale_order_item）
 *   会扣减 inventory_unit 的数量，因此库存必须先迁移完成
 *
 * 【与其他组件的连接】
 * - 依赖 CUSTOMER 任务：sale_order.customer_id 引用客户，
 *   客户必须先迁移完成才能正确写入外键
 * - 依赖 INVENTORY 任务：销售明细会扣减库存单元，
 *   库存必须先迁移完成以确保扣减操作的数据完整性
 * - 被依赖：SaleOrderItemMigration 依赖本任务，
 *   因为 sale_order_item.order_id 引用销售订单主键
 * - 映射组件：需使用 v1_customer_id_map 转换客户外键，
 *   并生成 v1_sale_order_id_map 供下游明细任务使用
 *
 * 【Kotlin 语法要点】
 * - class : PlannedMigrationTask(...)：Kotlin 的类继承与主构造函数委托，
 *   冒号后跟基类并直接在括号中传递构造参数，等价于 Java 的 super(id, deps)
 * - setOf(MigrationTaskId.CUSTOMER, MigrationTaskId.INVENTORY)：创建包含两个元素的不可变 Set，
 *   表示本任务有两个前置依赖——客户迁移和库存迁移，两者都必须先完成
 * - MigrationTaskId.SALE_ORDER：枚举值，作为任务的唯一标识符，
 *   会被持久化到 checkpoint/error 表中
 */
class SaleOrderMigration :
    PlannedMigrationTask(
        /** 任务唯一标识符，对应 MigrationTaskId.SALE_ORDER，持久化到检查点和错误记录中。 */
        MigrationTaskId.SALE_ORDER,
        /**
         * 前置依赖集合：CUSTOMER（销售订单引用 customer_id，知道卖给谁）
         * 和 INVENTORY（销售明细扣减库存单元，库存必须先就绪）。
         * 客户和库存都必须先迁移完成，销售订单才能正确写入。
         */
        setOf(MigrationTaskId.CUSTOMER, MigrationTaskId.INVENTORY),
    ) {
    override fun execute(context: MigrationContext): TaskResult =
        listOf(
            TableMigrationSupport().migrate(
                context = context,
                taskId = id,
                stream = "sale-order",
                sourceTable = "sale_order",
                columns = V1V2Columns.SALE_ORDER,
            ),
        ).toTaskResult(id)
}
