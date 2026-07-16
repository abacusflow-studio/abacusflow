package org.abacusflow.commons.tenant

/**
 * 标记接口，表示该实体受租户隔离。
 *
 * 实现此接口的实体必须拥有 [tenantId] 字段，
 * 并在实体类上声明 `@FilterDef` + `@Filter(name = "tenantFilter")`。
 *
 * 当 Hibernate Session 启用 `tenantFilter` 后，
 * 所有针对该实体的查询将自动追加 `WHERE tenant_id = :tenantId` 条件，
 * 业务代码无需手动传递 tenantId 参数。
 */
interface TenantScopedEntity {
    val tenantId: Long
}

