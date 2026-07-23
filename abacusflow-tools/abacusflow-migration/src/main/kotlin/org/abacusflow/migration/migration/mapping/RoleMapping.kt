package org.abacusflow.migration.migration.mapping

/**
 * V1 role → V2 tenant_role 映射逻辑。
 *
 * 规则：
 * 1. V1 角色名与 V2 预置角色 (admin/reader/operator) 相同时，
 *    映射到 V2 已有角色（复用 V2 ID），不创建新行。
 * 2. V1 角色名不在 V2 预置角色列表时，创建新 tenant_role 行，
 *    V2 分配新 ID，建立 v1_role_id → v2_role_id 映射。
 * 3. 映射结果写入 abacusflow_migration.v1_role_id_map 控制表。
 */
object RoleMapping {
    /** V2 预置角色名称集合（tenant_id=1 的 admin/reader/operator）。 */
    val V2_PRESET_ROLE_NAMES: Set<String> = setOf("admin", "reader", "operator")

    /**
     * 判断 V1 角色名是否映射到 V2 预置角色。
     * @return 映射后的 V2 角色名（可能与 V1 不同），或 null 表示需创建新角色。
     */
    fun mapRoleName(v1RoleName: String): String? = if (v1RoleName in V2_PRESET_ROLE_NAMES) v1RoleName else null

    /**
     * 为新建角色生成 V2 中的角色名。
     * 如果 V1 角色名与 V2 预置角色冲突但大小写不同，加前缀避免混淆。
     */
    fun resolveV2RoleName(v1RoleName: String): String {
        if (v1RoleName !in V2_PRESET_ROLE_NAMES) return v1RoleName
        // 不应到达这里——预置角色应该映射而非创建
        return "migrated_$v1RoleName"
    }
}
