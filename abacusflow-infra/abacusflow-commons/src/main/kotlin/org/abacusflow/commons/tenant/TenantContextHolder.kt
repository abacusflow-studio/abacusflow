package org.abacusflow.commons.tenant

/**
 * 纯 JVM ThreadLocal 持有者，存储当前请求的租户 ID。
 *
 * 无 Spring 依赖，可被 core 层实体（如 Product、Customer）在构造器默认参数中引用。
 * Spring 层的 [CurrentTenantProvider] 委托给此对象，二者共享同一个 ThreadLocal。
 *
 * 典型用法：
 * ```kotlin
 * // 实体构造器默认参数 — 自动从上下文获取 tenantId
 * override val tenantId: Long = TenantContextHolder.currentTenantId()
 *
 * // 定时任务 — 手动设置租户上下文
 * TenantContextHolder.setTenantId(tenantId)
 * try { ... } finally { TenantContextHolder.clear() }
 * ```
 */
object TenantContextHolder {
    private val tenantIdHolder = ThreadLocal<Long?>()

    /**
     * 获取当前租户 ID，若未设置则抛出异常。
     * 适用于实体构造器默认参数 — 创建实体时必须有租户上下文。
     */
    fun currentTenantId(): Long =
        tenantIdHolder.get()
            ?: throw IllegalStateException("No tenant context established for this request")

    /**
     * 获取当前租户 ID，若未设置则返回 null。
     * 适用于可选租户上下文的场景（如 TenantFilterAspect）。
     */
    fun currentTenantIdOrNull(): Long? = tenantIdHolder.get()

    /**
     * 设置当前租户 ID。
     * 由 [TenantContextFilter]（HTTP 请求）和定时任务调用。
     */
    fun setTenantId(tenantId: Long) {
        tenantIdHolder.set(tenantId)
    }

    /**
     * 清除当前租户 ID。
     * 必须在请求/任务结束时调用，防止 ThreadLocal 泄漏。
     */
    fun clear() {
        tenantIdHolder.remove()
    }
}
