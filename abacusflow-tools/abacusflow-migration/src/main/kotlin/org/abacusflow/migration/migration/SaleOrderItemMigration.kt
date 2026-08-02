package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult

/**
 * 迁移销售订单明细（sale_order_item）表，并为所有记录补 tenant_id。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线"第四层：业务关联实体"的销售链末端环节，负责将 V1 的销售订单明细
 * 迁移到 V2 的多租户体系。销售订单明细是销售订单的子项——每条明细记录对应订单中的
 * 一个行项（某个产品的销售数量、单价和折扣系数），通过 order_id 外键归属于父订单。
 * 因此明细必须在父订单之后迁移。
 *
 * 【V1→V2 映射要点】
 * 1. 补 tenant_id：V1 无多租户概念，所有销售订单明细记录需关联到 V2 默认租户
 * 2. 外键转换：order_id 需通过 v1_sale_order_id_map 转换为 V2 ID，
 *   确保引用的销售订单在 V2 中已存在
 * 3. 金额类型约束：unitPrice 和 discountFactor 必须使用 BigDecimal，
 *   **绝对禁止使用 Double**，因为浮点数存在精度丢失，
 *   在财务单价和折扣系数场景中不可接受
 * 4. product_id 转换：明细中的 product_id 需通过 v1_product_id_map 转换，
 *   确保引用的产品在 V2 中已存在
 * 5. 折扣系数语义：需确认 V1 的 discountFactor 语义与 V2 一致
 *   （如 0.9 表示九折还是 10% 折扣），避免语义偏差导致金额计算错误
 *
 * 【与其他组件的连接】
 * - 依赖 SALE_ORDER 任务：sale_order_item.order_id 引用销售订单主键，
 *   销售订单必须先迁移完成才能正确写入外键
 * - 被依赖：FinalizeMigration 依赖本任务（通过 SALE_ORDER_ITEM 间接依赖），
 *   因为收尾任务需要所有交易数据迁移完成后才能执行校验
 * - 映射组件：需使用 v1_sale_order_id_map 转换订单外键，
 *   需使用 v1_product_id_map 转换产品外键
 * - 检查点：如果销售订单明细数据量较大，建议使用批处理和检查点机制，
 *   以便断点续传时从上次中断处恢复
 *
 * 【Kotlin 语法要点】
 * - class : PlannedMigrationTask(...)：Kotlin 的类继承与主构造函数委托，
 *   冒号后跟基类并直接在括号中传递构造参数，等价于 Java 的 super(id, deps)
 * - setOf(MigrationTaskId.SALE_ORDER)：创建包含单个元素的不可变 Set，
 *   表示本任务的唯一前置依赖是销售订单迁移任务
 * - MigrationTaskId.SALE_ORDER_ITEM：枚举值，作为任务的唯一标识符，
 *   会被持久化到 checkpoint/error 表中
 */
class SaleOrderItemMigration :
    PlannedMigrationTask(
        /** 任务唯一标识符，对应 MigrationTaskId.SALE_ORDER_ITEM，持久化到检查点和错误记录中。 */
        MigrationTaskId.SALE_ORDER_ITEM,
        /**
         * 前置依赖集合：SALE_ORDER（明细引用 order_id 外键）。
         * 销售订单必须先迁移完成，明细才能正确写入外键引用。
         */
        setOf(MigrationTaskId.SALE_ORDER),
    ) {
    override fun execute(context: MigrationContext): TaskResult =
        listOf(
            TableMigrationSupport().migrate(
                context = context,
                taskId = id,
                stream = "sale-order-item",
                sourceTable = "sale_order_item",
                columns = V1V2Columns.SALE_ORDER_ITEM,
            ),
        ).toTaskResult(id)
}
