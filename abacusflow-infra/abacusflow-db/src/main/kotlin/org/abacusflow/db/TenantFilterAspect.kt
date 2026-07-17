package org.abacusflow.db

import jakarta.persistence.EntityManager
import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.aspectj.lang.annotation.Aspect
import org.aspectj.lang.annotation.Before
import org.hibernate.Session
import org.springframework.jdbc.core.JdbcTemplate
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
    private val entityManager: EntityManager,
    private val jdbcTemplate: JdbcTemplate,
) {
    @Before(
        "@within(org.springframework.transaction.annotation.Transactional) || " +
                "@annotation(org.springframework.transaction.annotation.Transactional)"
    )
//    @Before("@within(org.springframework.transaction.annotation.Transactional)")
    fun setupTenantContext() {
        val tenantId = currentTenantProvider.getCurrentTenantId()
        if (tenantId != null) {
            // 1. 启用 Hibernate Filter（应用层隔离）
            // 所有标记了 @Filter(name = "tenantFilter") 的实体查询自动追加 WHERE tenant_id = :tenantId
            val session = entityManager.unwrap(Session::class.java)
            session.enableFilter("tenantFilter").setParameter("tenantId", tenantId)

            // 2. 设置 PostgreSQL RLS 变量（数据库层隔离）
            // 即使应用层代码遗漏了 tenantId 条件，数据库 RLS 策略也会拦截跨租户访问
            jdbcTemplate.execute("SELECT set_config('app.tenant_id', '$tenantId', true)")
        }
    }
}