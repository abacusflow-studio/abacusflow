package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.tenant.CreateTenantInputTO
import org.abacusflow.usecase.tenant.TenantTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantCommandService {
    /**
     * 创建租户（自服务）。
     * 任何已认证用户都可以创建自己的租户，创建者自动成为该租户的 admin。
     * 不需要 platform:tenant:create 权限——这是用户的自服务操作，不是平台管理操作。
     */
    fun createTenant(input: CreateTenantInputTO): TenantTO

    /**
     * 更新当前租户信息（租户空间内）。
     * 调用方需确保用户是该租户的成员。
     */
    fun updateOwnTenant(tenantId: Long, displayName: String?): TenantTO

    /**
     * 平台管理员更新任意租户信息。
     */
    @PreAuthorize("hasAuthority('platform:tenant:update')")
    fun updateTenant(tenantId: Long, displayName: String?): TenantTO
}
