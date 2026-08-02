package org.abacusflow.migration.migration

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import org.abacusflow.migration.framework.TaskResult

/**
 * 迁移 V1 产品分类（product_category）和产品（product）到 V2，补填 tenant_id。
 *
 * 【设计目的与迁移管线中的角色】
 * 本任务是迁移管线中"业务实体层"的第一步，负责将 V1 的产品分类和产品数据
 * 迁移到 V2。产品是库存管理系统的核心实体，后续的库存迁移（InventoryMigration）
 * 和订单迁移都依赖本任务产出的产品 ID 映射。
 * 本任务需要处理两张表的数据迁移，且两张表之间存在父子依赖关系
 * （分类的 parent_id 引用自身），因此迁移顺序至关重要。
 *
 * 【V1→V2 映射要点】
 * - 迁移顺序：先迁 product_category，再迁 product。
 *   原因：product 表有 category_id 外键引用 product_category，
 *   必须确保分类先存在，产品才能正确写入。
 * - product_category 的父子关系：分类表通过 parent_id 引用自身，
 *   形成树形结构。迁移时必须保证父节点先于子节点写入 V2，
 *   否则外键约束会失败。实现时需要按拓扑顺序遍历分类树
 *   （先根节点，再逐层子节点）。
 * - V2 新增 tenant_id NOT NULL：V1 的产品分类和产品没有租户归属，
 *   V2 要求所有业务表必须有 tenant_id。迁移时需要从 v1_tenant_id_map
 *   读取默认租户 ID，为每条记录补填 tenant_id。
 * - 两张表必须使用**独立的 checkpoint stream**：
 *   - 一个 stream 跟踪 product_category 的迁移进度
 *   - 另一个 stream 跟踪 product 的迁移进度
 *   这样当分类迁移失败时，只需重跑分类 stream，不影响产品 stream；
 *   反之亦然。避免单一流导致整批重跑。
 * - 租户内唯一约束校验：V2 在租户范围内对产品的 barcode 和 name
 *   有唯一约束（UNIQUE(tenant_id, barcode) / UNIQUE(tenant_id, name)）。
 *   迁移时必须校验 V1 数据在租户内是否满足这些约束，
 *   发现冲突时记录到错误表而非静默跳过。
 *
 * 【与其他组件的连接】
 * - 前置依赖：TenantMigration（产品和分类都是租户级实体，
 *   需要从 v1_tenant_id_map 读取默认租户 ID）
 * - FieldMapping.withTenantId()：为迁移后的产品分类和产品记录填充 tenant_id
 * - 下游依赖者：InventoryMigration 使用本任务产出的产品 ID 映射
 *   （v1_product_id_map）将库存记录中的 product_id 转换为 V2 ID
 *
 * 【Kotlin 语法要点】
 * - setOf(MigrationTaskId.TENANT)：创建包含单个元素的不可变 Set，
 *   表示本任务仅依赖 TENANT 这一个前置任务。
 *   产品和分类都是租户级实体，需要租户先存在，但不依赖用户或权限。
 */
class ProductMigration(
    /**
     * 任务唯一标识符：MigrationTaskId.PRODUCT。
     *
     * 枚举值 cliName="product"，用于 checkpoint 记录、CLI 参数匹配和日志输出。
     */
    id: MigrationTaskId = MigrationTaskId.PRODUCT,
    /**
     * 前置依赖集合：{TENANT}。
     *
     * 产品和分类都是租户级实体，必须归属某个租户。
     * 从 v1_tenant_id_map 读取默认租户 ID，为记录填充 tenant_id。
     */
    dependencies: Set<MigrationTaskId> = setOf(MigrationTaskId.TENANT),
) : PlannedMigrationTask(id, dependencies) {
    override fun execute(context: MigrationContext): TaskResult {
        val support = TableMigrationSupport()
        val categoryColumns = V1V2Columns.PRODUCT_CATEGORY
        return listOf(
            support.migrate(
                context = context,
                taskId = id,
                stream = "product-category",
                sourceTable = "product_category",
                columns = categoryColumns.filterNot { it.sourceName == "parent_id" },
            ),
            support.update(
                context = context,
                taskId = id,
                stream = "product-category-parent",
                sourceTable = "product_category",
                columns = categoryColumns.filter { it.sourceName == "id" || it.sourceName == "parent_id" },
            ),
            support.migrate(
                context = context,
                taskId = id,
                stream = "product",
                sourceTable = "product",
                columns = V1V2Columns.PRODUCT,
            ),
        ).toTaskResult(id)
    }
}
