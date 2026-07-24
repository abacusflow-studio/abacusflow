package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 迁移供应商（supplier）表，并为所有记录补 tenant_id。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线"第四层：业务关联实体"的起始环节，负责将 V1 的供应商数据
 * 迁移到 V2 的多租户采购体系。供应商是采购链的源头实体——采购订单必须指定
 * 从哪个供应商采购，因此供应商必须在采购订单之前完成迁移。
 *
 * 【V1→V2 映射要点】
 * 1. 补 tenant_id：V1 无多租户概念，所有供应商记录需关联到 V2 默认租户
 * 2. ID 映射：如果 V2 不保留原 ID，需通过 v1_supplier_id_map 建立 ID 映射，
 *    后续 PurchaseOrderMigration 引用 supplier_id 时需查此映射表
 * 3. 唯一约束：需校验租户内供应商名称/编码的唯一约束冲突，
 *    V1 中全局唯一的名称在 V2 多租户下可能与其他租户冲突
 *
 * 【与其他组件的连接】
 * - 依赖 TENANT 任务：supplier 属于租户级实体，必须关联 tenant_id
 * - 被依赖：PurchaseOrderMigration 依赖本任务，
 *   因为 purchase_order.supplier_id 引用供应商主键
 * - 映射组件：后续采购订单需使用 v1_supplier_id_map 转换外键
 *
 * 【Kotlin 语法要点】
 * - class : PlannedMigrationTask(...)：Kotlin 的类继承与主构造函数委托，
 *   冒号后跟基类并直接在括号中传递构造参数，等价于 Java 的 super(id, deps)
 * - setOf(MigrationTaskId.TENANT)：创建包含单个元素的不可变 Set，
 *   表示本任务的唯一前置依赖是租户迁移任务
 * - MigrationTaskId.SUPPLIER：枚举值，作为任务的唯一标识符，
 *   会被持久化到 checkpoint/error 表中
 */
class SupplierMigration :
    PlannedMigrationTask(
        /** 任务唯一标识符，对应 MigrationTaskId.SUPPLIER，持久化到检查点和错误记录中。 */
        MigrationTaskId.SUPPLIER,
        /**
         * 前置依赖集合：TENANT（供应商是租户级实体，必须关联 tenant_id）。
         * 租户必须先迁移完成，供应商才能正确写入外键引用。
         */
        setOf(MigrationTaskId.TENANT),
    )
