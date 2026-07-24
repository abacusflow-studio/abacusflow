package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移采购订单（purchase_order）表，并为所有记录补 tenant_id。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线"第四层：业务关联实体"的采购链核心环节，负责将 V1 的采购订单
 * 迁移到 V2 的多租户体系。采购订单是采购链的中间实体——上游关联供应商，
 * 下游被采购订单明细引用。因此采购订单必须在供应商之后、采购订单明细之前迁移。
 *
 * 【V1→V2 映射要点】
 * 1. 补 tenant_id：V1 无多租户概念，所有采购订单记录需关联到 V2 默认租户
 * 2. 外键转换：supplier_id 需通过 v1_supplier_id_map 转换为 V2 ID，
 *   确保引用的供应商在 V2 中已存在
 * 3. ID 映射：如果 V2 不保留原 ID，需通过 v1_purchase_order_id_map 建立 ID 映射，
 *   后续 PurchaseOrderItemMigration 引用 order_id 时需查此映射表
 * 4. 订单状态映射：V1 的订单状态枚举值需映射到 V2 的状态枚举，
 *   需确认状态语义完全对齐，不存在 V1 有而 V2 无的状态
 *
 * 【与其他组件的连接】
 * - 依赖 SUPPLIER 任务：purchase_order.supplier_id 引用供应商，
 *   供应商必须先迁移完成才能正确写入外键
 * - 被依赖：PurchaseOrderItemMigration 依赖本任务，
 *   因为 purchase_order_item.order_id 引用采购订单主键
 * - 映射组件：需使用 v1_supplier_id_map 转换供应商外键，
 *   并生成 v1_purchase_order_id_map 供下游明细任务使用
 *
 * 【Kotlin 语法要点】
 * - class : PlannedMigrationTask(...)：Kotlin 的类继承与主构造函数委托，
 *   冒号后跟基类并直接在括号中传递构造参数，等价于 Java 的 super(id, deps)
 * - setOf(MigrationTaskId.SUPPLIER)：创建包含单个元素的不可变 Set，
 *   表示本任务的唯一前置依赖是供应商迁移任务
 * - MigrationTaskId.PURCHASE_ORDER：枚举值，作为任务的唯一标识符，
 *   会被持久化到 checkpoint/error 表中
 */
class PurchaseOrderMigration :
    PlannedMigrationTask(
        /** 任务唯一标识符，对应 MigrationTaskId.PURCHASE_ORDER，持久化到检查点和错误记录中。 */
        MigrationTaskId.PURCHASE_ORDER,
        /**
         * 前置依赖集合：SUPPLIER（采购订单引用 supplier_id）。
         * 供应商必须先迁移完成，采购订单才能正确写入外键引用。
         */
        setOf(MigrationTaskId.SUPPLIER),
    )
