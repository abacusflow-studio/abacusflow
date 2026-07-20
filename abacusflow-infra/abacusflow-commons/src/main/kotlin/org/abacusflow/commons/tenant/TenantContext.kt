package org.abacusflow.commons.tenant

/**
 * 在指定租户上下文中执行代码块，执行完毕后恢复原有上下文。
 *
 * 适用于定时任务等需要逐租户遍历的场景：
 * ```kotlin
 * tenants.forEach { tenant ->
 *     try {
 *         withTenant(tenant.id) {
 *             autoCompleteEligibleOrderStatus(tenant.id)
 *         }
 *     } catch (e: Exception) {
 *         logger.error("Failed for tenant ${tenant.id}", e)
 *     }
 * }
 * ```
 *
 * @param tenantId 要设置的租户 ID
 * @param block 在租户上下文中执行的代码
 * @return 代码块的返回值
 */
inline fun <T> withTenant(
    tenantId: Long,
    block: () -> T,
): T {
    val previousTenantId = TenantContextHolder.currentTenantIdOrNull()
    TenantContextHolder.setTenantId(tenantId)
    try {
        return block()
    } finally {
        if (previousTenantId == null) {
            TenantContextHolder.clear()
        } else {
            TenantContextHolder.setTenantId(previousTenantId)
        }
    }
}
