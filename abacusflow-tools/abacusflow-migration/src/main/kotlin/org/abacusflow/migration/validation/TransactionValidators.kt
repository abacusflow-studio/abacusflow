package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 供应商校验器 —— 校验迁移后的供应商数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * SupplierValidator 负责验证供应商迁移（SupplierMigration）的结果是否正确。
 * 供应商是采购交易的核心参与方，采购订单必须关联供应商。
 * 如果供应商数据有问题：
 * - 采购订单无法关联到正确的供应商
 * - 供应商数据重复导致同一供应商被当作多个供应商处理
 * - 供应商归属错误导致租户间数据混乱
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **供应商数量**：V1 源数据库的供应商总数必须与 V2 目标数据库的供应商总数
 *    完全一致。数量不匹配意味着有供应商在迁移过程中丢失或重复。
 * 2. **名称唯一性**：V2 中的供应商名称在同一租户内必须唯一。
 *    供应商名称是业务标识，重复会导致：
 *    - 用户选择供应商时产生歧义
 *    - 报表统计时同一供应商的数据被分散
 *    - 采购流程中无法确定交易对手
 * 3. **租户归属**：V2 中的每个供应商必须正确归属到某个租户。
 *    V2 采用多租户架构，供应商是租户级的资源，如果供应商没有归属到
 *    正确的租户，会导致该租户下的用户无法看到或操作这些供应商。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：SupplierMigration（taskId = MigrationTaskId.SUPPLIER）
 * - 依赖校验器：TenantValidator（供应商必须归属某个租户）
 * - 下游校验器：PurchaseOrderValidator（采购订单引用供应商 ID）
 * - 在 StandardValidationPlan 中第十个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.SUPPLIER：将校验器与供应商迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class SupplierValidator :
    TableCountValidator(
        MigrationTaskId.SUPPLIER,
        listOf(TableValidationSpec("supplier")),
    )

/**
 * 采购订单校验器 —— 校验迁移后的采购订单数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * PurchaseOrderValidator 负责验证采购订单迁移（PurchaseOrderMigration）的结果是否正确。
 * 采购订单记录了从供应商采购商品的交易信息，是采购交易的核心单据。
 * 如果采购订单数据有问题：
 * - 采购历史记录丢失，无法追溯采购来源
 * - 订单状态错误导致库存入库流程异常
 * - 供应商关联错误导致交易对手信息不匹配
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **采购订单数量**：V1 中的采购订单总数必须与 V2 中的总数完全一致。
 *    数量不匹配意味着有订单在迁移过程中丢失或重复。
 * 2. **状态分布**：V1 中各状态（如草稿、已确认、已完成、已取消）的
 *    订单数量分布必须与 V2 一致。状态分布校验比总量校验更精细，
 *    能发现"总量匹配但状态映射错误"的问题（如已完成的订单被映射为草稿）。
 * 3. **供应商引用完整性**：每条采购订单的 supplierId 必须指向 V2 中
 *    已存在的供应商。供应商引用缺失意味着供应商迁移遗漏或 ID 映射错误，
 *    会导致采购订单无法关联到正确的供应商。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：PurchaseOrderMigration（taskId = MigrationTaskId.PURCHASE_ORDER）
 * - 依赖校验器：SupplierValidator（采购订单引用供应商）
 * - 下游校验器：PurchaseOrderItemValidator（采购明细引用采购订单 ID）
 * - 在 StandardValidationPlan 中第十一个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.PURCHASE_ORDER：将校验器与采购订单迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class PurchaseOrderValidator :
    TableCountValidator(
        MigrationTaskId.PURCHASE_ORDER,
        listOf(TableValidationSpec("purchase_order")),
    )

/**
 * 采购订单明细校验器 —— 校验迁移后的采购订单行项数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * PurchaseOrderItemValidator 负责验证采购订单明细迁移（PurchaseOrderItemMigration）
 * 的结果是否正确。采购订单明细是采购订单的子项，记录了每项采购的
 * 具体产品、数量、单价和金额。如果明细数据有问题：
 * - 采购金额汇总错误，影响财务对账
 * - 产品关联错误，影响库存入库的准确性
 * - 订单与明细不匹配，影响采购单的完整性
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **采购明细数量**：V1 中的采购明细总数必须与 V2 中的总数完全一致。
 *    数量不匹配意味着有明细在迁移过程中丢失或重复。
 * 2. **金额聚合**：V2 中每张采购订单的明细金额之和必须与该订单的
 *    总金额一致，且 V1 的金额聚合必须与 V2 的金额聚合完全匹配。
 *    金额是财务数据，不允许任何精度损失或舍入误差。
 * 3. **产品引用完整性**：每条采购明细的 productId 必须指向 V2 中
 *    已存在的产品。产品引用缺失意味着产品迁移遗漏或 ID 映射错误，
 *    会导致采购明细无法关联到正确的产品，影响库存入库。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：PurchaseOrderItemMigration（taskId = MigrationTaskId.PURCHASE_ORDER_ITEM）
 * - 依赖校验器：PurchaseOrderValidator（明细归属采购订单）、ProductValidator（明细引用产品）
 * - 在 StandardValidationPlan 中第十二个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.PURCHASE_ORDER_ITEM：将校验器与采购明细迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class PurchaseOrderItemValidator :
    TableCountValidator(
        MigrationTaskId.PURCHASE_ORDER_ITEM,
        listOf(
            TableValidationSpec(
                "purchase_order_item",
                aggregateExpressions =
                    mapOf(
                        "quantity" to "quantity",
                        "amount" to "COALESCE(unit_price, 0) * quantity",
                    ),
            ),
        ),
    )

/**
 * 客户校验器 —— 校验迁移后的客户数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * CustomerValidator 负责验证客户迁移（CustomerMigration）的结果是否正确。
 * 客户是销售交易的核心参与方，销售订单必须关联客户。
 * 如果客户数据有问题：
 * - 销售订单无法关联到正确的客户
 * - 客户数据重复导致同一客户被当作多个客户处理
 * - 客户归属错误导致租户间数据混乱
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **客户数量**：V1 源数据库的客户总数必须与 V2 目标数据库的客户总数
 *    完全一致。数量不匹配意味着有客户在迁移过程中丢失或重复。
 * 2. **名称唯一性**：V2 中的客户名称在同一租户内必须唯一。
 *    客户名称是业务标识，重复会导致：
 *    - 用户选择客户时产生歧义
 *    - 报表统计时同一客户的数据被分散
 *    - 销售流程中无法确定交易对手
 * 3. **租户归属**：V2 中的每个客户必须正确归属到某个租户。
 *    V2 采用多租户架构，客户是租户级的资源，如果客户没有归属到
 *    正确的租户，会导致该租户下的用户无法看到或操作这些客户。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：CustomerMigration（taskId = MigrationTaskId.CUSTOMER）
 * - 依赖校验器：TenantValidator（客户必须归属某个租户）
 * - 下游校验器：SaleOrderValidator（销售订单引用客户 ID）
 * - 在 StandardValidationPlan 中第十三个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.CUSTOMER：将校验器与客户迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class CustomerValidator :
    TableCountValidator(
        MigrationTaskId.CUSTOMER,
        listOf(TableValidationSpec("customer")),
    )

/**
 * 销售订单校验器 —— 校验迁移后的销售订单数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * SaleOrderValidator 负责验证销售订单迁移（SaleOrderMigration）的结果是否正确。
 * 销售订单记录了向客户销售商品的交易信息，是销售交易的核心单据。
 * 如果销售订单数据有问题：
 * - 销售历史记录丢失，无法追溯销售去向
 * - 订单状态错误导致库存出库流程异常
 * - 客户关联错误导致交易对手信息不匹配
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **销售订单数量**：V1 中的销售订单总数必须与 V2 中的总数完全一致。
 *    数量不匹配意味着有订单在迁移过程中丢失或重复。
 * 2. **状态分布**：V1 中各状态（如草稿、已确认、已完成、已取消）的
 *    订单数量分布必须与 V2 一致。状态分布校验比总量校验更精细，
 *    能发现"总量匹配但状态映射错误"的问题（如已完成的订单被映射为草稿）。
 * 3. **客户引用完整性**：每条销售订单的 customerId 必须指向 V2 中
 *    已存在的客户。客户引用缺失意味着客户迁移遗漏或 ID 映射错误，
 *    会导致销售订单无法关联到正确的客户。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：SaleOrderMigration（taskId = MigrationTaskId.SALE_ORDER）
 * - 依赖校验器：CustomerValidator（销售订单引用客户）
 * - 下游校验器：SaleOrderItemValidator（销售明细引用销售订单 ID）
 * - 在 StandardValidationPlan 中第十四个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.SALE_ORDER：将校验器与销售订单迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class SaleOrderValidator :
    TableCountValidator(
        MigrationTaskId.SALE_ORDER,
        listOf(TableValidationSpec("sale_order")),
    )

/**
 * 销售订单明细校验器 —— 校验迁移后的销售订单行项数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * SaleOrderItemValidator 负责验证销售订单明细迁移（SaleOrderItemMigration）
 * 的结果是否正确。销售订单明细是销售订单的子项，记录了每项销售的
 * 具体产品、数量、单价和金额，以及关联的库存单元。如果明细数据有问题：
 * - 销售金额汇总错误，影响财务对账
 * - 库存单元关联错误，影响库存出库的准确性
 * - 订单与明细不匹配，影响销售单的完整性
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **销售明细数量**：V1 中的销售明细总数必须与 V2 中的总数完全一致。
 *    数量不匹配意味着有明细在迁移过程中丢失或重复。
 * 2. **金额聚合**：V2 中每张销售订单的明细金额之和必须与该订单的
 *    总金额一致，且 V1 的金额聚合必须与 V2 的金额聚合完全匹配。
 *    金额是财务数据，不允许任何精度损失或舍入误差。
 * 3. **库存单元引用完整性**：每条销售明细的 inventoryUnitId 必须指向
 *    V2 中已存在的库存单元。库存单元引用缺失意味着库存迁移遗漏
 *    或 ID 映射错误，会导致销售明细无法关联到正确的库存记录，
 *    影响库存出库和成本核算。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：SaleOrderItemMigration（taskId = MigrationTaskId.SALE_ORDER_ITEM）
 * - 依赖校验器：SaleOrderValidator（明细归属销售订单）、InventoryValidator（明细引用库存单元）
 * - 在 StandardValidationPlan 中第十五个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.SALE_ORDER_ITEM：将校验器与销售明细迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class SaleOrderItemValidator :
    TableCountValidator(
        MigrationTaskId.SALE_ORDER_ITEM,
        listOf(
            TableValidationSpec(
                "sale_order_item",
                aggregateExpressions =
                    mapOf(
                        "quantity" to "quantity",
                        "gross-amount" to "COALESCE(unit_price, 0) * quantity",
                        "discount-factor" to "COALESCE(discount_factor, 0)",
                    ),
            ),
        ),
    )
