package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移采购订单明细（purchase_order_item）表，并为所有记录补 tenant_id。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线"第四层：业务关联实体"的采购链末端环节，负责将 V1 的采购订单明细
 * 迁移到 V2 的多租户体系。采购订单明细是采购订单的子项——每条明细记录对应订单中的
 * 一个行项（某个产品的采购数量和单价），通过 order_id 外键归属于父订单。
 * 因此明细必须在父订单之后迁移。
 *
 * 【V1→V2 映射要点】
 * 1. 补 tenant_id：V1 无多租户概念，所有采购订单明细记录需关联到 V2 默认租户
 * 2. 外键转换：order_id 需通过 v1_purchase_order_id_map 转换为 V2 ID，
 *   确保引用的采购订单在 V2 中已存在
 * 3. 金额类型约束：unitPrice 必须使用 BigDecimal，**绝对禁止使用 Double**，
 *   因为浮点数存在精度丢失，在财务单价场景中不可接受
 * 4. product_id 转换：明细中的 product_id 需通过 v1_product_id_map 转换，
 *   确保引用的产品在 V2 中已存在
 *
 * 【与其他组件的连接】
 * - 依赖 PURCHASE_ORDER 任务：purchase_order_item.order_id 引用采购订单主键，
 *   采购订单必须先迁移完成才能正确写入外键
 * - 映射组件：需使用 v1_purchase_order_id_map 转换订单外键，
 *   需使用 v1_product_id_map 转换产品外键
 * - 检查点：如果采购订单明细数据量较大，建议使用批处理和检查点机制，
 *   以便断点续传时从上次中断处恢复
 *
 * 【Kotlin 语法要点】
 * - class : PlannedMigrationTask(...)：Kotlin 的类继承与主构造函数委托，
 *   冒号后跟基类并直接在括号中传递构造参数，等价于 Java 的 super(id, deps)
 * - setOf(MigrationTaskId.PURCHASE_ORDER)：创建包含单个元素的不可变 Set，
 *   表示本任务的唯一前置依赖是采购订单迁移任务
 * - MigrationTaskId.PURCHASE_ORDER_ITEM：枚举值，作为任务的唯一标识符，
 *   会被持久化到 checkpoint/error 表中
 */
class PurchaseOrderItemMigration :
    PlannedMigrationTask(
        /** 任务唯一标识符，对应 MigrationTaskId.PURCHASE_ORDER_ITEM，持久化到检查点和错误记录中。 */
        MigrationTaskId.PURCHASE_ORDER_ITEM,
        /**
         * 前置依赖集合：PURCHASE_ORDER（明细引用 order_id 外键）。
         * 采购订单必须先迁移完成，明细才能正确写入外键引用。
         */
        setOf(MigrationTaskId.PURCHASE_ORDER),
    )
