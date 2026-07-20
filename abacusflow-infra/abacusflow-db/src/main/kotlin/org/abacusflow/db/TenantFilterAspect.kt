package org.abacusflow.db

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.aspectj.lang.annotation.Aspect
import org.aspectj.lang.annotation.Before
import org.springframework.stereotype.Component

/**
 * 租户上下文自动设置切面。
 *
 * 在每个 @Transactional 方法执行前，自动完成两层租户隔离：
 * 1. 启用 Hibernate Filter（应用层隔离）—— 自动为所有 TenantScopedEntity 查询追加 tenant_id 条件
 * 2. 设置 PostgreSQL RLS 变量（数据库层隔离）—— 即使应用层遗漏，数据库也会拦截跨租户访问
 *
 * 这两层防线确保租户数据隔离的可靠性：
 * - Hibernate Filter 是第一道防线，在应用层自动过滤
 * - PostgreSQL RLS 是第二道防线，在数据库层强制隔离
 */
@Aspect
@Component
class TenantFilterAspect(
    private val currentTenantProvider: CurrentTenantProvider,
    private val tenantPersistenceContext: TenantPersistenceContext,
) {
    //    @Before("@within(org.springframework.transaction.annotation.Transactional)")
    @Before(
        "@within(org.springframework.transaction.annotation.Transactional) || " +
            "@annotation(org.springframework.transaction.annotation.Transactional)",
    )
    fun setupTenantContext() {
        val tenantId = currentTenantProvider.getCurrentTenantId()
        if (tenantId != null) {
            tenantPersistenceContext.activate(tenantId)
        }
    }
}
