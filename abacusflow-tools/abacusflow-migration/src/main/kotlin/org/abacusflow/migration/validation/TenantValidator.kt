package org.abacusflow.migration.validation

import org.abacusflow.migration.framework.MigrationContext
import org.abacusflow.migration.framework.MigrationTaskId
import java.time.Duration
import java.time.Instant

/**
 * 租户校验器 —— 校验迁移后的租户数据是否正确。
 *
 * 【设计目的与迁移管线中的角色】
 * TenantValidator 是迁移校验管线的第一个校验器，负责验证租户迁移
 * （TenantMigration）的结果是否正确。租户是 V2 多租户架构的根基，
 * 几乎所有其他实体（用户、产品、仓库等）都依赖租户，
 * 因此租户数据的正确性至关重要——如果租户数据有问题，
 * 后续所有实体的校验都可能受到影响。
 *
 * 【校验内容】
 * 本校验器需要验证以下三个方面：
 * 1. **默认租户唯一**：V2 系统中应该有且仅有一个默认租户（default tenant），
 *    不能有多个默认租户导致业务逻辑混乱，也不能没有默认租户导致
 *    系统无法正常启动。
 * 2. **状态正确**：默认租户的状态必须是"有效/激活"状态，
 *    不能是禁用或删除状态，否则系统无法使用该租户进行默认操作。
 * 3. **有且仅有一个有效 tenant_placement**：tenant_placement 记录了
 *    租户在多租户架构中的放置信息（如数据库连接、schema 等），
 *    必须恰好有一条有效记录，不能缺失（无法连接）也不能重复（连接冲突）。
 *
 * 【与其他组件的连接】
 * - 对应迁移任务：TenantMigration（taskId = MigrationTaskId.TENANT）
 * - 依赖上下文：MigrationContext 提供源数据库和目标数据库的访问
 * - 下游校验器：UserValidator、MembershipValidator 等依赖租户数据的正确性
 * - 在 StandardValidationPlan 中第一个注册，保证最先执行
 *
 * 【Kotlin 语法要点】
 * - 继承 PlannedMigrationValidator：获得防空跑机制，未实现时抛异常
 * - 构造函数参数 MigrationTaskId.TENANT：将校验器与租户迁移任务绑定
 * - 类体为空：当前是骨架实现，等待后续填充校验逻辑
 */
class TenantValidator : MigrationValidator {
    override val taskId: MigrationTaskId = MigrationTaskId.TENANT

    override fun validate(context: MigrationContext): ValidationResult {
        val startedAt = Instant.now(context.clock)
        val tenant = context.options.defaultTenant
        val violations = mutableListOf<String>()
        val target =
            context.target.read { dsl ->
                dsl.fetchOne(
                    """
                    SELECT t.name, t.display_name, t.status::text AS status,
                           p.cell_id, p.storage_mode::text AS storage_mode
                    FROM tenant t
                    LEFT JOIN tenant_placement p ON p.tenant_id = t.id
                    WHERE t.id = ?
                    """.trimIndent(),
                    tenant.id,
                )
            }
        if (target == null) {
            violations += "Default tenant id=${tenant.id} does not exist"
        } else {
            if (target.get("name", String::class.java) != tenant.name) {
                violations += "Default tenant name does not match '${tenant.name}'"
            }
            if (target.get("status", String::class.java) != "ACTIVE") {
                violations += "Default tenant status is not ACTIVE"
            }
            if (target.get("cell_id", String::class.java).isNullOrBlank()) {
                violations += "Default tenant placement is missing"
            }
        }
        return ValidationResult(
            taskId = taskId,
            passed = violations.isEmpty(),
            metrics = mapOf("tenant-id" to tenant.id.toString()),
            violations = violations,
            duration = Duration.between(startedAt, Instant.now(context.clock)),
        )
    }
}
