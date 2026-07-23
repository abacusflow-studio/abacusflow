package org.abacusflow.migration.migration.mapping

/**
 * V1 permission name → V2 permission name 映射表。
 *
 * V1 权限命名规则：{resource}:{action}（如 product:read）
 * V2 权限命名规则：{scope}:{resource}:{action}（如 business:product:read）
 *
 * scope 分类规则：
 * - user / role / permission 相关 → PLATFORM
 * - 其余业务权限 → BUSINESS
 *
 * V2 已有 51 个 seed 权限。映射时只匹配 V2 已有权限，
 * 无匹配的 V1 权限记录为 unmapped。
 */
object PermissionMapping {
    /**
     * V1 权限名 → V2 权限名的完整映射表。
     * 基于 V2 seed data (V002__init_data.sql) 中的 51 个权限。
     */
    val V1_TO_V2_NAME: Map<String, String> =
        mapOf(
            // Platform scope
            "user:read" to "platform:user:read",
            "user:manage" to "platform:user:manage",
            "role:read" to "platform:role:read",
            "role:manage" to "platform:role:manage",
            "permission:read" to "platform:permission:read",
            "permission:manage" to "platform:permission:manage",
            "tenant:list" to "platform:tenant:list",
            "tenant:create" to "platform:tenant:create",
            "tenant:update" to "platform:tenant:update",
            "tenant:delete" to "platform:tenant:delete",
            // Tenant scope (V1 可能没有对应的，但以防万一)
            "tenant:profile:read" to "tenant:profile:read",
            "tenant:profile:update" to "tenant:profile:update",
            "tenant:member:read" to "tenant:member:read",
            "tenant:member:create" to "tenant:member:create",
            "tenant:member:update" to "tenant:member:update",
            "tenant:member:remove" to "tenant:member:remove",
            "tenant:role:read" to "tenant:role:read",
            "tenant:role:manage" to "tenant:role:manage",
            // Business scope
            "product:read" to "business:product:read",
            "product:create" to "business:product:create",
            "product:update" to "business:product:update",
            "product:delete" to "business:product:delete",
            "product-category:read" to "business:product-category:read",
            "product-category:create" to "business:product-category:create",
            "product-category:update" to "business:product-category:update",
            "product-category:delete" to "business:product-category:delete",
            "purchase-order:read" to "business:purchase-order:read",
            "purchase-order:create" to "business:purchase-order:create",
            "purchase-order:approve" to "business:purchase-order:approve",
            "sale-order:read" to "business:sale-order:read",
            "sale-order:create" to "business:sale-order:create",
            "sale-order:approve" to "business:sale-order:approve",
            "inventory:read" to "business:inventory:read",
            "inventory:update" to "business:inventory:update",
            "inventory-unit:read" to "business:inventory-unit:read",
            "inventory-unit:update" to "business:inventory-unit:update",
            "depot:read" to "business:depot:read",
            "depot:create" to "business:depot:create",
            "depot:update" to "business:depot:update",
            "depot:delete" to "business:depot:delete",
            "customer:read" to "business:customer:read",
            "customer:create" to "business:customer:create",
            "customer:update" to "business:customer:update",
            "customer:delete" to "business:customer:delete",
            "supplier:read" to "business:supplier:read",
            "supplier:create" to "business:supplier:create",
            "supplier:update" to "business:supplier:update",
            "supplier:delete" to "business:supplier:delete",
            "feedback:create" to "business:feedback:create",
            "feedback:read" to "business:feedback:read",
            "feedback:update" to "business:feedback:update",
        )

    /** 根据 V1 权限名推断 scope。 */
    fun inferScope(v1PermissionName: String): String {
        val resource = v1PermissionName.substringBefore(":")
        return when (resource) {
            "user", "role", "permission", "tenant" -> "PLATFORM"
            else -> "BUSINESS"
        }
    }

    /** 映射 V1 权限名到 V2 权限名，无匹配返回 null。 */
    fun mapPermissionName(v1Name: String): String? = V1_TO_V2_NAME[v1Name]
}
