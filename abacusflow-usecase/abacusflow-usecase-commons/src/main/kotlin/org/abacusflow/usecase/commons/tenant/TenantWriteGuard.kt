package org.abacusflow.usecase.commons.tenant

import org.springframework.stereotype.Component

/**
 * Guard that checks whether the current tenant is allowed to perform write operations.
 * In P0, all tenants are always writable. This is a future extension point for:
 * - Blocking writes during tenant migration (WRITE_BLOCKED status)
 * - Checking storage mode for dedicated database routing
 */
@Component
class TenantWriteGuard {
    fun requireWritable(tenantId: Long) {
        // P0: All tenants are writable. Future: check TenantPlacement.status
    }
}
