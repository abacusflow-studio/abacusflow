package org.abacusflow.migration.migration.mapping

/**
 * V1 权限名 → V2 权限名的映射表。
 *
 * 【设计目的与迁移管线中的角色】
 * 本对象是迁移管线中"权限迁移"步骤的核心映射策略组件。
 * V1 到 V2 的权限体系发生了重大变化——引入了 scope（作用域）层级，
 * 权限命名从两段式 {resource}:{action} 升级为三段式 {scope}:{resource}:{action}。
 * 本对象维护了完整的 V1→V2 权限名映射表，确保每条 V1 权限记录
 * 都能准确对应到 V2 中已存在的种子权限 (seed permission)。
 *
 * 【V1 与 V2 权限命名规则对比】
 * - V1 权限命名：{resource}:{action}（如 product:read）
 *   ——扁平结构，所有权限在同一层级，无租户隔离概念
 * - V2 权限命名：{scope}:{resource}:{action}（如 business:product:read）
 *   ——三段式结构，scope 区分权限所属层级，支持多租户隔离
 *
 * 【scope 分类规则】
 * - PLATFORM：平台级权限，涉及用户/角色/权限/租户管理等系统管理功能
 *   对应 V1 中的 user、role、permission、tenant 资源
 * - TENANT：租户级权限，涉及租户内部管理（成员管理、角色分配等）
 *   V1 中可能没有直接对应，但 V2 新增了此层级
 * - BUSINESS：业务级权限，涉及产品/库存/订单/仓库/客户/供应商等核心业务
 *   对应 V1 中除平台管理外的所有资源
 *
 * 【映射策略】
 * V2 已有 51 个种子权限（由 V002__init_data.sql 初始化）。
 * 映射时只匹配 V2 已有权限，无匹配的 V1 权限记录为 unmapped（未映射），
 * 而非自动生成新权限名。这种"白名单"策略确保：
 * 1. 不会因 V1 中存在非标准权限而污染 V2 权限体系
 * 2. 迁移后 V2 的权限集合完全可控、可审计
 * 3. 未映射权限可由人工审查后决定是否手动添加
 *
 * 【与其他组件的连接】
 * - 被 PermissionMigration 任务调用，将 V1 role_permission 关联中的权限名转换为 V2 权限名
 * - 被 RolePermissionMigration 任务间接依赖（需要 V2 权限 ID 来建立角色-权限关联）
 * - inferScope() 被 RoleMigration 等任务用于判断权限所属层级
 * - 映射结果写入 abacusflow_migration 控制表供后续步骤查询
 *
 * 【Kotlin 语法要点】
 * - object：Kotlin 单例对象，全局唯一实例，适合存放静态映射表
 * - Map<String, String>：不可变映射，使用 mapOf() + to 中缀函数创建键值对
 * - to：Kotlin 中缀函数，创建 Pair，在 mapOf() 中用于构建键值对
 * - substringBefore(":")：字符串扩展函数，提取冒号前的部分（即 resource 名）
 * - when 表达式：Kotlin 的 switch 增强版，此处用于模式匹配 resource → scope
 */
object PermissionMapping {
    /**
     * V1 权限名 → V2 权限名的完整映射表。
     *
     * 基于 V2 seed data (V002__init_data.sql) 中的 51 个权限。
     * 每一行 "v1Name" to "v2Name" 表示 V1 中的 v1Name 权限
     * 在 V2 中对应为 v2Name 权限。
     *
     * 映射表按 scope 分组排列，便于维护和审查：
     */
    val V1_TO_V2_NAME: Map<String, String> =
        mapOf(
            // ===== Platform scope =====
            // 平台级权限：用户管理、角色管理、权限管理、租户管理
            // V1 中这些权限直接以 user/role/permission/tenant 为资源名
            // V2 中统一加上 "platform:" 前缀，表示这些是跨租户的平台管理权限
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
            // ===== Tenant scope =====
            // 租户级权限：租户内部管理（资料、成员、角色）
            // V1 中可能没有直接对应的权限（V1 是单租户，无需租户内部管理）
            // 但以防万一 V1 中存在类似权限，仍提供映射
            "tenant:profile:read" to "tenant:profile:read",
            "tenant:profile:update" to "tenant:profile:update",
            "tenant:member:read" to "tenant:member:read",
            "tenant:member:create" to "tenant:member:create",
            "tenant:member:update" to "tenant:member:update",
            "tenant:member:remove" to "tenant:member:remove",
            "tenant:role:read" to "tenant:role:read",
            "tenant:role:manage" to "tenant:role:manage",
            // ===== Business scope =====
            // 业务级权限：产品、分类、采购、销售、库存、仓库、客户、供应商、反馈
            // V1 中这些权限以业务资源名为前缀
            // V2 中统一加上 "business:" 前缀，表示这些是租户内的业务操作权限
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

    /**
     * 根据 V1 权限名推断 scope（作用域）。
     *
     * 【映射逻辑】
     * 从 V1 权限名中提取 resource 部分（冒号前的字符串），
     * 然后根据 resource 名称判断所属 scope：
     * - user/role/permission/tenant → PLATFORM（平台级管理）
     * - 其他所有资源 → BUSINESS（业务级操作）
     *
     * 【为什么需要推断 scope】
     * 1. 当 V1 权限名不在 V1_TO_V2_NAME 映射表中时，需要推断其 scope
     *    以便在迁移报告中标记其所属层级
     * 2. 某些迁移步骤需要按 scope 分组处理权限（如 PLATFORM 权限只分配给平台管理员）
     * 3. 为未来可能的自动生成 V2 权限名提供基础逻辑
     *
     * 【Kotlin 语法要点】
     * - substringBefore(":")：Kotlin 标准库扩展函数，
     *   返回字符串中第一个指定分隔符之前的部分
     *   例如 "product:read".substringBefore(":") → "product"
     * - when 表达式：Kotlin 的多分支条件表达式，类似 Java 的 switch 但更强大
     *   此处用逗号分隔多个匹配值，表示任一匹配即执行对应分支
     *
     * @param v1PermissionName V1 权限名（格式：{resource}:{action}）
     * @return 推断的 scope 名称（"PLATFORM" 或 "BUSINESS"）
     */
    fun inferScope(v1PermissionName: String): String {
        val resource = v1PermissionName.substringBefore(":")
        return when (resource) {
            "user", "role", "permission", "tenant" -> "PLATFORM"
            else -> "BUSINESS"
        }
    }

    /**
     * 映射 V1 权限名到 V2 权限名。
     *
     * 【映射逻辑】
     * 直接在 V1_TO_V2_NAME 映射表中查找，有匹配则返回 V2 权限名，
     * 无匹配则返回 null。
     *
     * 【为什么返回 null 而非抛异常】
     * 1. V1 中可能存在 V2 没有的自定义权限，这是合法场景而非错误
     * 2. 调用方需要区分"已映射"和"未映射"，null 是最自然的表达
     * 3. 未映射权限会被记录到迁移错误表，由人工审查处理
     *
     * 【Kotlin 语法要点】
     * - Map 的 [] 运算符：Kotlin 中 map[key] 等价于 Java 的 map.get(key)，
     *   键不存在时返回 null（而非抛异常），返回类型为 String?（可空）
     *
     * @param v1Name V1 权限名
     * @return 对应的 V2 权限名，无匹配时返回 null
     */
    fun mapPermissionName(v1Name: String): String? = V1_TO_V2_NAME[v1Name]
}
