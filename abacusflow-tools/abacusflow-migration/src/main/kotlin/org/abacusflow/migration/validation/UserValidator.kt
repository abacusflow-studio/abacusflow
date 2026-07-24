package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationTaskId

/**
 * 用户校验器 —— 校验迁移后的用户数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * UserValidator 负责验证用户迁移（UserMigration）的结果是否正确。
 * 用户是系统的认证与授权主体，用户数据的丢失或损坏会导致：
 * - 用户无法登录系统
 * - 权限关联失效（角色、权限等无法正确绑定到用户）
 * - 审计日志中的操作者信息缺失
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **用户总数匹配**：V1 源数据库的用户总数必须与 V2 目标数据库的用户总数
 *    完全一致。数量不匹配意味着有用户在迁移过程中丢失或重复。
 * 2. **ID 集合摘要**：比较 V1 和 V2 的用户 ID 集合，确保所有 V1 用户 ID
 *    都在 V2 中有对应记录。这是数量校验的增强版——数量可能偶然匹配
 *    但 ID 不一致（如某些用户丢失但被其他重复用户补上了数量）。
 * 3. **关键字段空值/重复检查**：检查用户的关键字段（如用户名、邮箱等）
 *    是否存在不应有的空值或重复值。空值意味着数据映射缺失，
 *    重复值意味着唯一性约束被违反。
 *
 * 【为什么抽样校验不能替代全量聚合】
 * 抽样校验（随机抽取部分记录逐字段比对）虽然速度快，
 * 但无法替代全量聚合校验，原因如下：
 * - **遗漏问题**：抽样可能恰好没有抽到有问题的记录，
 *   给出"校验通过"的错误结论
 * - **聚合偏差**：抽样无法验证总数、ID 集合等聚合指标，
 *   而这些指标是数据完整性的核心保障
 * - **置信度不足**：即使抽样通过，也无法给出确定性的结论
 * 因此，本校验器应采用全量聚合校验，确保数据完整性的确定性保障。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：UserMigration（taskId = MigrationTaskId.USER）
 * - 依赖校验器：TenantValidator（用户必须归属某个租户）
 * - 下游校验器：MembershipValidator（成员关系引用用户 ID）
 * - 在 StandardValidationPlan 中第二个注册
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.USER：将校验器与用户迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class UserValidator : PlannedMigrationValidator(MigrationTaskId.USER)
