package org.abacusflow.migration.migration.mapping

/**
 * 通用字段映射工具。
 *
 * 【设计目的与迁移管线中的角色】
 * 本对象是迁移管线中所有数据迁移任务的共享工具组件。
 * V1→V2 的数据迁移不仅涉及表名和 ID 的变化，还涉及字段级别的转换，
 * 最关键的变化是 V2 引入了多租户架构，所有业务表新增了 tenant_id NOT NULL 字段。
 * 本对象集中管理这些通用字段映射逻辑，避免在各迁移任务中重复编写。
 *
 * 【V1 与 V2 的核心字段差异】
 * 1. tenant_id：V1 所有业务表没有此字段（单租户无需隔离），
 *    V2 所有业务表需要 tenant_id NOT NULL（多租户强制隔离）
 * 2. 枚举值：V1 和 V2 的大部分枚举值保持一致（如 M/F、MATERIAL/ASSET），
 *    但保留映射函数以便未来版本出现差异时只需修改此处
 *
 * 【为什么枚举映射函数目前是直通的】
 * 虽然当前 V1 和 V2 的枚举值完全相同（函数直接返回输入值），
 * 但仍然定义了独立的映射函数，原因：
 * 1. 防御性编程：如果未来 V2 枚举值发生变化，只需修改映射函数，
 *    而不需要在所有调用点逐一修改
 * 2. 显式契约：调用方通过函数名明确表达"此处需要映射"的意图，
 *    而非隐式假设 V1/V2 枚举值相同
 * 3. 审计追踪：在代码审查时可以快速定位所有涉及枚举映射的位置
 *
 * 【与其他组件的连接】
 * - withTenantId() 被所有业务数据迁移任务调用（ProductMigration、DepotMigration 等）
 * - mapXxx() 枚举映射函数被对应实体的迁移任务调用
 * - 这些函数操作的是 MutableMap<String, Any?> 字段字典，
 *   该字典是迁移任务从 V1 读取记录后构建的中间表示
 *
 * 【Kotlin 语法要点】
 * - object：Kotlin 单例对象，无状态工具方法的理想容器
 * - MutableMap<String, Any?>：可变键值映射，键为字段名，值为任意类型（含 null）
 *   Any? 是 Kotlin 的顶层可空类型，等价于 Java 的 Object 但支持 null
 * - 函数式风格：withTenantId 返回修改后的同一 Map 引用，支持链式调用
 */
object FieldMapping {
    /**
     * 为 V2 记录填充 tenant_id。
     *
     * 【映射逻辑】
     * V1 所有业务表没有 tenant_id 字段（单租户架构下无需区分租户），
     * V2 所有业务表需要 tenant_id NOT NULL（多租户架构下强制隔离）。
     * 此函数在 V1 记录的字段字典中插入 tenant_id 键值对，
     * 使其满足 V2 表的 NOT NULL 约束。
     *
     * 【为什么返回 MutableMap 而非 Unit】
     * 返回修改后的 Map 引用，支持调用方链式写法：
     *   FieldMapping.withTenantId(tenantId, fields)["other_field"] = value
     * 实际上函数修改的是传入的同一个 Map 对象（副作用+返回引用）。
     *
     * 【tenantId 的来源】
     * tenantId 由上游的 TenantMigration 任务确定——
     * V1 的所有数据归属于一个默认租户，该租户在 V2 中的 ID
     * 由 TenantMigration 创建后写入控制表。
     *
     * @param tenantId V2 中的租户 ID（由 TenantMigration 生成或映射）
     * @param fields V1 记录的字段字典（可变），函数会向其中插入 tenant_id
     * @return 同一个 fields 引用（已包含 tenant_id），便于链式调用
     */
    fun withTenantId(
        tenantId: Long,
        fields: MutableMap<String, Any?>,
    ): MutableMap<String, Any?> {
        fields["tenant_id"] = tenantId
        return fields
    }

    /**
     * V1 user_sex 枚举映射。
     *
     * V1 和 V2 使用相同的枚举值：M（男性）/ F（女性）。
     * 当前为直通映射（直接返回输入值），保留函数以便未来扩展。
     *
     * @param v1Sex V1 中的性别枚举值（"M" 或 "F"），可为 null
     * @return V2 中的性别枚举值，当前与 V1 相同
     */
    fun mapSex(v1Sex: String?): String? = v1Sex

    /**
     * V1 product_type 枚举映射。
     *
     * V1 和 V2 使用相同的枚举值：MATERIAL（物料）/ ASSET（资产）。
     * 当前为直通映射，保留函数以便未来扩展。
     * - MATERIAL：消耗性物料，如原材料、办公用品
     * - ASSET：固定资产，如设备、工具
     *
     * @param v1Type V1 中的产品类型枚举值，可为 null
     * @return V2 中的产品类型枚举值，当前与 V1 相同
     */
    fun mapProductType(v1Type: String?): String? = v1Type

    /**
     * V1 product_unit 枚举映射。
     *
     * V1 和 V2 使用相同的枚举值。
     * 产品计量单位（如：个、件、箱、公斤等）。
     * 当前为直通映射，保留函数以便未来扩展。
     *
     * @param v1Unit V1 中的产品单位枚举值，可为 null
     * @return V2 中的产品单位枚举值，当前与 V1 相同
     */
    fun mapProductUnit(v1Unit: String?): String? = v1Unit

    /**
     * V1 order_status 枚举映射。
     *
     * V1 和 V2 使用相同的枚举值：
     * - PENDING：待处理（订单已创建但未完成）
     * - COMPLETED：已完成（订单已履行）
     * - CANCELED：已取消（订单被取消）
     * - REVERSED：已冲销（订单被逆向冲销，用于纠错）
     * 当前为直通映射，保留函数以便未来扩展。
     *
     * @param v1Status V1 中的订单状态枚举值，可为 null
     * @return V2 中的订单状态枚举值，当前与 V1 相同
     */
    fun mapOrderStatus(v1Status: String?): String? = v1Status

    /**
     * V1 inventory_status 枚举映射。
     *
     * V1 和 V2 使用相同的枚举值：
     * - NORMAL：正常（库存可用）
     * - CONSUMED：已消耗（库存已被使用）
     * - CANCELED：已取消（库存记录被取消）
     * - REVERSED：已冲销（库存被逆向冲销）
     * 当前为直通映射，保留函数以便未来扩展。
     *
     * @param v1Status V1 中的库存状态枚举值，可为 null
     * @return V2 中的库存状态枚举值，当前与 V1 相同
     */
    fun mapInventoryStatus(v1Status: String?): String? = v1Status

    /**
     * V1 inventory_unit_type 枚举映射。
     *
     * V1 和 V2 使用相同的枚举值：
     * - INSTANCE：实例型（每个库存项独立追踪，如序列号设备）
     * - BATCH：批次型（按批次追踪，如一批原材料）
     * 当前为直通映射，保留函数以便未来扩展。
     *
     * @param v1Type V1 中的库存单位类型枚举值，可为 null
     * @return V2 中的库存单位类型枚举值，当前与 V1 相同
     */
    fun mapInventoryUnitType(v1Type: String?): String? = v1Type
}
