package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 角色校验器 —— 校验迁移后的角色数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * RoleValidator 负责验证角色迁移（RoleMigration）的结果是否正确。
 * 角色是 V2 授权体系的核心概念，用于将权限分组并分配给用户。
 * 如果角色数据有问题，会导致权限分配混乱，用户可能获得不应有的权限
 * 或缺少应有的权限。
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **角色数量**：V1 源数据库的角色总数必须与 V2 目标数据库的角色总数
 *    完全一致。数量不匹配意味着有角色在迁移过程中丢失或重复。
 * 2. **业务键唯一性**：角色的业务键（如角色名称或角色编码）在 V2 中
 *    必须全局唯一。如果出现重复，说明迁移过程中存在数据映射冲突
 *    或去重逻辑缺失，会导致权限分配歧义。
 * 3. **默认租户归属**：V2 中的角色必须正确归属到默认租户。
 *    V2 采用多租户架构，角色是租户级的资源，如果角色没有归属到
 *    正确的租户，会导致该租户下的用户无法使用这些角色。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：RoleMigration（taskId = MigrationTaskId.ROLE）
 * - 依赖校验器：TenantValidator（角色必须归属某个租户）
 * - 下游校验器：RolePermissionValidator（角色-权限关联引用角色 ID）
 * - 在 StandardValidationPlan 中第四个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.ROLE：将校验器与角色迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class RoleValidator :
    TableCountValidator(
        MigrationTaskId.ROLE,
        listOf(
            TableValidationSpec(
                "role",
                "tenant_role",
                targetMayContainSeedRows = true,
                comparePreservedIds = false,
            ),
        ),
    )

/**
 * 权限校验器 —— 校验迁移后的权限数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * PermissionValidator 负责验证权限迁移（PermissionMigration）的结果是否正确。
 * 权限定义了系统中可执行的操作（如"创建产品"、"查看库存"），
 * 是授权体系的最细粒度控制单元。如果权限数据有问题：
 * - 用户可能无法执行应有的操作（权限缺失）
 * - 用户可能执行不应有的操作（权限多余）
 * - 系统功能异常（权限 code 与实际功能不匹配）
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **权限 code/name 映射完整性**：V1 中每个权限的 code（编码）
 *    和 name（名称）在 V2 中都必须有对应的映射。code 是权限的
 *    唯一标识（如 "product:create"），name 是人类可读的描述
 *    （如 "创建产品"）。映射缺失意味着某些权限在 V2 中丢失。
 * 2. **scope 合法性**：权限的 scope（作用域）必须是 V2 系统中
 *    预定义的合法值。V2 的权限 scope 可能与 V1 不同
 *    （如 V1 是全局权限，V2 是租户级权限），迁移时需要做 scope 转换，
 *    校验时需确认转换后的 scope 值合法。
 * 3. **没有静默丢弃的旧权限**：V1 中的所有权限都必须在 V2 中有对应记录，
 *    不能有任何权限在迁移过程中被静默丢弃。静默丢弃意味着：
 *    - 迁移逻辑认为某些 V1 权限在 V2 中不再需要而跳过
 *    - 但没有在迁移报告中记录这一决策
 *    - 运维人员无法知道哪些权限被丢弃、为什么被丢弃
 *    这种"静默"行为是危险的，应该显式记录或报错。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：PermissionMigration（taskId = MigrationTaskId.PERMISSION）
 * - 依赖校验器：TenantValidator（权限按租户分配）
 * - 下游校验器：RolePermissionValidator（角色-权限关联引用权限 ID）
 * - 在 StandardValidationPlan 中第五个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.PERMISSION：将校验器与权限迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class PermissionValidator :
    TableCountValidator(
        MigrationTaskId.PERMISSION,
        listOf(
            TableValidationSpec(
                "permission",
                tenantAware = false,
                targetMayContainSeedRows = true,
                comparePreservedIds = false,
            ),
        ),
    )

/**
 * 角色-权限关联校验器 —— 校验迁移后的角色-权限关联数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * RolePermissionValidator 负责验证角色-权限关联迁移（RolePermissionMigration）
 * 的结果是否正确。角色-权限关联是授权体系的"连接器"，
 * 它将权限分配给角色，再通过角色分配给用户。如果关联数据有问题：
 * - 角色可能缺少应有的权限（用户无法执行操作）
 * - 角色可能拥有不应有的权限（安全漏洞）
 * - 孤儿关联记录浪费存储且可能导致查询异常
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **角色-权限关联数量**：V1 中的角色-权限关联总数必须与 V2 中的
 *    总数完全一致。数量不匹配意味着有关联在迁移过程中丢失或重复。
 * 2. **孤儿记录**：V2 中的每条角色-权限关联记录必须满足：
 *    - roleId 指向 V2 中已存在的角色
 *    - permissionId 指向 V2 中已存在的权限
 *    孤儿记录意味着角色或权限迁移遗漏，或 ID 映射错误。
 * 3. **业务键比对关联集合**：按业务键（如角色名+权限编码）分组比较
 *    V1 和 V2 的关联集合，确保每个角色拥有的权限集合完全一致。
 *    这是数量校验的增强版——数量可能偶然匹配但具体关联不一致
 *    （如角色 A 的权限被错误地分配给了角色 B）。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：RolePermissionMigration（taskId = MigrationTaskId.ROLE_PERMISSION）
 * - 依赖校验器：RoleValidator（角色必须存在）、PermissionValidator（权限必须存在）
 * - 在 StandardValidationPlan 中第六个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.ROLE_PERMISSION：将校验器与角色-权限关联迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class RolePermissionValidator :
    TableCountValidator(
        MigrationTaskId.ROLE_PERMISSION,
        listOf(
            TableValidationSpec(
                "role_permission",
                "tenant_role_permission",
                tenantAware = false,
                targetMayContainSeedRows = true,
                comparePreservedIds = false,
            ),
            TableValidationSpec(
                "user_role",
                "tenant_membership_role",
                tenantAware = false,
                targetMayContainSeedRows = true,
                comparePreservedIds = false,
            ),
        ),
    )
