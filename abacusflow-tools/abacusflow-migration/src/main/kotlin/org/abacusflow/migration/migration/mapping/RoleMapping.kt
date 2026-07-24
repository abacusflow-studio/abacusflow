package org.abacusflow.migration.migration.mapping

/**
 * V1 角色 → V2 租户角色 (tenant_role) 的映射逻辑。
 *
 * 【设计目的与迁移管线中的角色】
 * 本对象是迁移管线中"角色迁移"步骤的核心映射策略组件。
 * 在 AbacusFlow 从 V1（单租户架构）迁移到 V2（多租户架构）的过程中，
 * 角色体系发生了根本性变化：V1 的全局角色变成了 V2 的租户级角色 (tenant_role)。
 * 本对象负责定义 V1 角色名如何映射到 V2 角色名，以及何时应复用已有角色、何时应创建新角色。
 *
 * 【映射规则】
 * 1. V1 角色名与 V2 预置角色 (admin/reader/operator) 相同时，
 *    映射到 V2 已有角色（复用 V2 ID），不创建新行。
 *    ——这是为了避免在 V2 中重复创建系统内置角色，保证权限体系的一致性。
 * 2. V1 角色名不在 V2 预置角色列表时，创建新 tenant_role 行，
 *    V2 分配新 ID，建立 v1_role_id → v2_role_id 映射。
 *    ——自定义角色需要保留，但必须挂载到对应租户下。
 * 3. 映射结果写入 abacusflow_migration.v1_role_id_map 控制表。
 *    ——控制表用于后续步骤（如用户-角色关联迁移）查找 V1 ID 对应的 V2 ID。
 *
 * 【与其他组件的连接】
 * - 被 RoleMigration 任务调用，决定每条 V1 角色记录的处理方式
 * - 映射结果被 MembershipMigration / RolePermissionMigration 等下游任务依赖
 * - v1_role_id_map 控制表被 JooqMigrationCheckpointRepository 读写
 *
 * 【Kotlin 语法要点】
 * - object：Kotlin 单例对象声明，整个应用只有一个 RoleMapping 实例，
 *   适合存放无状态的纯映射逻辑和常量集合
 * - Set<String>：不可变集合，使用 setOf() 创建，保证预置角色名不会被意外修改
 * - in 运算符：检查元素是否属于集合，等价于 Java 的 contains()
 * - Elvis 运算符 (?:) 未在此处使用，但 if-else 表达式返回 String? 可空类型
 */
object RoleMapping {
    /**
     * V2 预置角色名称集合（tenant_id=1 的 admin/reader/operator）。
     *
     * 这三个角色是 V2 系统在初始化种子数据 (seed data) 时自动创建的，
     * 分别对应：管理员（全部权限）、只读用户（查看权限）、操作员（业务操作权限）。
     * 使用 Set 而非 List 是因为只需要做成员判断（O(1) 查找），不需要顺序。
     */
    val V2_PRESET_ROLE_NAMES: Set<String> = setOf("admin", "reader", "operator")

    /**
     * 判断 V1 角色名是否映射到 V2 预置角色。
     *
     * 【映射逻辑】
     * - 如果 V1 角色名在预置集合中（如 "admin"），直接返回该名称，
     *   表示 V2 中已有此角色，无需创建新行，只需建立 ID 映射关系。
     * - 如果 V1 角色名不在预置集合中（如 "warehouse_manager"），返回 null，
     *   表示这是一个自定义角色，需要在 V2 中新建 tenant_role 记录。
     *
     * 【为什么返回 String? 而非布尔值】
     * 返回映射后的角色名（而非简单的 true/false）是因为：
     * 1. 调用方需要知道映射后的具体角色名（虽然当前是同名映射，但未来可能不同）
     * 2. null 语义明确——"无映射，需创建"，比 (true, false) 更具表达力
     * 3. 与 PermissionMapping.mapPermissionName 的 API 风格保持一致
     *
     * @param v1RoleName V1 中的角色名称
     * @return 映射后的 V2 角色名（当前与 V1 相同），或 null 表示需创建新角色
     */
    fun mapRoleName(v1RoleName: String): String? = if (v1RoleName in V2_PRESET_ROLE_NAMES) v1RoleName else null

    /**
     * 为新建角色生成 V2 中的角色名。
     *
     * 【设计意图】
     * 当 V1 角色名与 V2 预置角色冲突时（理论上不应发生，因为 mapRoleName 会先拦截），
     * 加 "migrated_" 前缀以避免与预置角色混淆。
     *
     * 【正常路径 vs 防御路径】
     * - 正常路径：v1RoleName 不在预置集合中，直接使用原名（大多数自定义角色走此路径）
     * - 防御路径：v1RoleName 在预置集合中但仍然需要创建（不应到达的分支），
     *   加前缀 "migrated_" 确保不会覆盖预置角色
     *
     * 【为什么需要这个方法】
     * 虽然 mapRoleName 已经处理了预置角色的映射，但在某些边界场景下
     * （如 V1 有大小写不同的 "Admin" 角色），可能需要创建而非映射。
     * 此方法提供了一个安全的名称生成策略。
     *
     * @param v1RoleName V1 中的角色名称
     * @return 可安全用于 V2 新建角色的名称
     */
    fun resolveV2RoleName(v1RoleName: String): String {
        if (v1RoleName !in V2_PRESET_ROLE_NAMES) return v1RoleName
        // 不应到达这里——预置角色应该通过 mapRoleName 映射而非创建新行
        // 如果到达此处，说明存在同名但需独立创建的边界情况，加前缀避免冲突
        return "migrated_$v1RoleName"
    }
}
