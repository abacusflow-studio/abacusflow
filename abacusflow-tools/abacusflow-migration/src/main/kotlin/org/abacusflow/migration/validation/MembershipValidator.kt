package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 成员关系校验器 —— 校验迁移后的用户-租户成员关系是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * MembershipValidator 负责验证成员关系迁移（MembershipMigration）的结果是否正确。
 * 成员关系（Membership）是用户与租户之间的多对多关联，
 * 它决定了用户可以访问哪些租户的数据。如果成员关系数据有问题：
 * - 用户可能无法访问自己应有的租户数据
 * - 用户可能意外访问到不应有的租户数据（安全隐患）
 * - 默认租户设置错误导致用户登录后进入错误的租户上下文
 *
 * 【校验内容】
 * 本校验器需要验证以下两个方面：
 * 1. **每个应迁用户恰有一条默认租户 membership**：
 *    V2 系统要求每个用户必须有一个默认租户（default tenant membership），
 *    用于用户登录后的初始上下文。校验时需要确认：
 *    - 每个已迁移用户都有至少一条 membership 记录
 *    - 每个已迁移用户恰好有一条标记为"默认"的 membership
 *    - 没有用户拥有多条默认 membership（会导致系统无法确定初始上下文）
 * 2. **不存在孤儿 user/tenant 引用**：
 *    membership 记录中的 userId 必须指向 V2 中已存在的用户，
 *    tenantId 必须指向 V2 中已存在的租户。孤儿引用意味着：
 *    - userId 指向不存在的用户：数据映射错误或用户迁移遗漏
 *    - tenantId 指向不存在的租户：租户迁移遗漏或 ID 映射错误
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：MembershipMigration（taskId = MigrationTaskId.MEMBERSHIP）
 * - 依赖校验器：TenantValidator（租户必须存在）、UserValidator（用户必须存在）
 * - 下游校验器：RolePermissionValidator（角色-权限关联可能引用成员关系）
 * - 在 StandardValidationPlan 中第三个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.MEMBERSHIP：将校验器与成员关系迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class MembershipValidator : PlannedMigrationValidator(MigrationTaskId.MEMBERSHIP)
