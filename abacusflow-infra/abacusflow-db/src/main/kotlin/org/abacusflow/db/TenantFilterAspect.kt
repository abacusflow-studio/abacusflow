package org.abacusflow.db

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.aspectj.lang.annotation.Aspect
import org.aspectj.lang.annotation.Before
import org.springframework.stereotype.Component

/**
 * 租户上下文自动设置切面。
 *
 * 在每个 @Transactional 方法执行前，设置 PostgreSQL RLS 使用的当前租户变量。
 *
 * Hibernate Filter 已通过 `@FilterDef(autoEnabled = true)` 全局自动启用，并由
 * TenantFilterParameterResolver 从请求上下文解析租户 ID，不再依赖本切面或业务方法的事务注解。
 * 本切面只负责数据库层 RLS；即使应用层查询出现疏漏，数据库仍会强制隔离。
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
    fun setupTenantRlsContext() {
        val tenantId = currentTenantProvider.getCurrentTenantId()
        if (tenantId != null) {
            tenantPersistenceContext.activate(tenantId)
        }
    }
}
