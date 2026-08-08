package org.abacusflow.commons.tenant

import java.util.function.Supplier

/**
 * 为 Hibernate 全局租户过滤器提供当前请求的租户 ID。
 *
 * Hibernate 在执行受租户保护的实体查询时自动调用此解析器，因此业务服务和仓储查询
 * 不需要手动启用过滤器，也不需要为了租户过滤而额外声明事务。
 * 未建立租户上下文时会直接抛出异常，避免意外执行无租户条件的查询。
 */
class TenantFilterParameterResolver : Supplier<Long> {
    override fun get(): Long = TenantContextHolder.currentTenantId()
}
