package org.abacusflow.usecase.commons.tenant

import org.abacusflow.commons.tenant.TenantContextHolder
import org.springframework.stereotype.Component

/**
 * Spring Bean 封装的租户上下文提供者，委托给 [org.abacusflow.commons.tenant.TenantContextHolder]。
 *
 * 由 [TenantContextFilter] 为每个 HTTP 请求设置，定时任务也会手动调用。
 * 适用于需要依赖注入的场景（如 Service 构造器注入）。
 *
 * 对于 core 层实体（无 Spring 依赖），直接使用 [org.abacusflow.commons.tenant.TenantContextHolder]。
 */
@Component
class CurrentTenantProvider {
    fun getCurrentTenantId(): Long? = TenantContextHolder.currentTenantIdOrNull()

    fun requireTenantId(): Long = TenantContextHolder.currentTenantId()

    fun setTenantId(tenantId: Long) = TenantContextHolder.setTenantId(tenantId)

    fun clear() = TenantContextHolder.clear()
}