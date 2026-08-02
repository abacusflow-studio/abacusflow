package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult

/**
 * 迁移客户（customer）表，并为所有记录补 tenant_id。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线"第四层：业务关联实体"的销售链起始环节，负责将 V1 的客户数据
 * 迁移到 V2 的多租户销售体系。客户是销售链的源头实体——销售订单必须指定
 * 卖给哪个客户，因此客户必须在销售订单之前完成迁移。
 *
 * 【V1→V2 映射要点】
 * 1. 补 tenant_id：V1 无多租户概念，所有客户记录需关联到 V2 默认租户
 * 2. ID 映射：如果 V2 不保留原 ID，需通过 v1_customer_id_map 建立 ID 映射，
 *   后续 SaleOrderMigration 引用 customer_id 时需查此映射表
 * 3. 唯一约束：需校验租户内客户名称/编码的唯一约束冲突，
 *   V1 中全局唯一的名称在 V2 多租户下可能与其他租户冲突
 * 4. 客户与供应商的去重：如果同一实体既是客户又是供应商，
 *   需确认 V2 中 Partner 模型是否统一处理，避免重复创建
 *
 * 【与其他组件的连接】
 * - 依赖 TENANT 任务：customer 属于租户级实体，必须关联 tenant_id
 * - 被依赖：SaleOrderMigration 依赖本任务，
 *   因为 sale_order.customer_id 引用客户主键
 * - 映射组件：后续销售订单需使用 v1_customer_id_map 转换外键
 *
 * 【Kotlin 语法要点】
 * - class : PlannedMigrationTask(...)：Kotlin 的类继承与主构造函数委托，
 *   冒号后跟基类并直接在括号中传递构造参数，等价于 Java 的 super(id, deps)
 * - setOf(MigrationTaskId.TENANT)：创建包含单个元素的不可变 Set，
 *   表示本任务的唯一前置依赖是租户迁移任务
 * - MigrationTaskId.CUSTOMER：枚举值，作为任务的唯一标识符，
 *   会被持久化到 checkpoint/error 表中
 */
class CustomerMigration :
    PlannedMigrationTask(
        /** 任务唯一标识符，对应 MigrationTaskId.CUSTOMER，持久化到检查点和错误记录中。 */
        MigrationTaskId.CUSTOMER,
        /**
         * 前置依赖集合：TENANT（客户是租户级实体，必须关联 tenant_id）。
         * 租户必须先迁移完成，客户才能正确写入外键引用。
         */
        setOf(MigrationTaskId.TENANT),
    ) {
    override fun execute(context: MigrationContext): TaskResult =
        listOf(
            TableMigrationSupport().migrate(
                context = context,
                taskId = id,
                stream = "customer",
                sourceTable = "customer",
                columns = V1V2Columns.CUSTOMER,
            ),
        ).toTaskResult(id)
}
