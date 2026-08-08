package org.abacusflow.commons.tenant

/**
 * 标记接口，表示该实体受租户隔离。
 *
 * 实现此接口的实体必须拥有 [tenantId] 字段，
 * 并在实体类上声明 `@Filter(name = "tenantFilter")`。
 *
 * `@FilterDef(name = "tenantFilter", ...)` 只需在一个实体上全局定义，
 * Hibernate 会全局注册，其他实体只需 `@Filter` 引用即可。
 *
 * `tenantFilter` 会在每个 Hibernate Session 中自动启用，并从 [TenantContextHolder] 读取租户 ID。
 * 所有针对该实体的查询将自动追加 `WHERE tenant_id = :tenantId` 条件，
 * 业务代码无需手动传递 tenantId 参数，也无需为了启用过滤器而增加事务注解。
 */
interface TenantScopedEntity {
    val tenantId: Long
}
