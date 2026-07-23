package org.abacusflow.migration.migration.mapping

/**
 * 通用字段映射工具。
 * V1→V2 字段名/类型转换函数，tenant_id 填充逻辑。
 */
object FieldMapping {
    /**
     * 为 V2 记录填充 tenant_id。
     * V1 所有业务表没有 tenant_id，V2 所有业务表需要 tenant_id NOT NULL。
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
     * V1 和 V2 使用相同的枚举值：M / F。
     */
    fun mapSex(v1Sex: String?): String? = v1Sex

    /**
     * V1 product_type 枚举映射。
     * V1 和 V2 使用相同的枚举值：MATERIAL / ASSET。
     */
    fun mapProductType(v1Type: String?): String? = v1Type

    /**
     * V1 product_unit 枚举映射。
     * V1 和 V2 使用相同的枚举值。
     */
    fun mapProductUnit(v1Unit: String?): String? = v1Unit

    /**
     * V1 order_status 枚举映射。
     * V1 和 V2 使用相同的枚举值：PENDING / COMPLETED / CANCELED / REVERSED。
     */
    fun mapOrderStatus(v1Status: String?): String? = v1Status

    /**
     * V1 inventory_status 枚举映射。
     * V1 和 V2 使用相同的枚举值：NORMAL / CONSUMED / CANCELED / REVERSED。
     */
    fun mapInventoryStatus(v1Status: String?): String? = v1Status

    /**
     * V1 inventory_unit_type 枚举映射。
     * V1 和 V2 使用相同的枚举值：INSTANCE / BATCH。
     */
    fun mapInventoryUnitType(v1Type: String?): String? = v1Type
}
