package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 库存校验器 —— 校验迁移后的库存及库存单元数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * InventoryValidator 负责验证库存迁移（InventoryMigration）的结果是否正确。
 * 库存是库存管理系统的核心数据，记录了"某个产品在某个仓库中有多少数量"。
 * 库存数据直接关系到：
 * - 业务决策：是否需要补货、是否可以接单
 * - 财务核算：库存价值计算依赖精确的数量和金额
 * - 订单处理：销售出库时扣减库存、采购入库时增加库存
 * 如果库存数据有问题，可能导致超卖、库存丢失、财务数据错误等严重后果。
 *
 * 【校验内容】
 * 本校验器需要验证以下六个方面：
 * 1. **inventory/inventory_unit 数量**：V1 中的库存记录总数和库存单元总数
 *    必须与 V2 中的对应数量完全一致。数量不匹配意味着有记录在迁移
 *    过程中丢失或重复。
 * 2. **库存总数量**：V2 中所有库存记录的数量（quantity）之和必须与 V1 的
 *    总数量完全一致。这是对数量字段的聚合校验，比逐条校验更高效，
 *    能快速发现数量级的问题。
 * 3. **冻结量**：V2 中所有库存记录的冻结数量（frozenQuantity）之和必须与
 *    V1 的冻结总量一致。冻结量表示已被订单占用但尚未出库的数量，
 *    冻结量错误会导致可用库存计算错误，进而导致超卖或无法接单。
 * 4. **精确金额**：V2 中库存的金额字段（如成本价、库存价值）必须与 V1
 *    精确匹配。金额是财务数据，不允许任何精度损失或舍入误差。
 *    这要求迁移时使用精确的数值类型（如 BigDecimal）而非浮点数。
 * 5. **产品引用**：每条库存记录的 productId 必须指向 V2 中已存在的产品。
 *    产品引用缺失意味着产品迁移遗漏或 ID 映射错误。
 * 6. **仓库引用**：每条库存记录的 depotId 必须指向 V2 中已存在的仓库。
 *    仓库引用缺失意味着仓库迁移遗漏或 ID 映射错误。
 * 7. **订单引用**：库存单元（inventory_unit）如果关联了采购/销售订单，
 *    其 orderId 必须指向 V2 中已存在的订单。订单引用缺失意味着
 *    订单迁移遗漏或 ID 映射错误。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：InventoryMigration（taskId = MigrationTaskId.INVENTORY）
 * - 依赖校验器：ProductValidator（产品必须存在）、DepotValidator（仓库必须存在）
 * - 下游校验器：SaleOrderItemValidator（销售明细引用库存单元 ID）
 * - 在 StandardValidationPlan 中第九个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.INVENTORY：将校验器与库存迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class InventoryValidator : PlannedMigrationValidator(MigrationTaskId.INVENTORY)
