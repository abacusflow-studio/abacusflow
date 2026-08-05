package org.abacusflow.usecase.tenant.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.tenant.CreateTenantInputTO
import org.abacusflow.usecase.tenant.TenantProvisioningTO
import org.abacusflow.usecase.tenant.TenantTO
import org.springframework.security.access.prepost.PreAuthorize

interface TenantCommandService {
    /** 平台供应租户；创建者不会自动成为租户成员。 */
    @PreAuthorize(RequiredAuthority.PLATFORM_TENANT_CREATE)
    fun createTenant(input: CreateTenantInputTO): TenantProvisioningTO

    /**
     * 更新当前租户信息（租户空间内）。
     * 调用方需确保用户是该租户的成员。
     */
    @PreAuthorize(RequiredAuthority.TENANT_PROFILE_UPDATE)
    fun updateOwnTenant(
        tenantId: Long,
        displayName: String?,
    ): TenantTO

    /**
     * 平台管理员更新任意租户信息。
     */
    @PreAuthorize(RequiredAuthority.PLATFORM_TENANT_UPDATE)
    fun updateTenant(
        tenantId: Long,
        displayName: String?,
    ): TenantTO
}
