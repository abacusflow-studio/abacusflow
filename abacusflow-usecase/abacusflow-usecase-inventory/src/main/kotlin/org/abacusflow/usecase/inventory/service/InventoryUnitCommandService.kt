package org.abacusflow.usecase.inventory.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.springframework.security.access.prepost.PreAuthorize

interface InventoryUnitCommandService {
    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_UNIT_UPDATE)
    fun assignDepot(
        id: Long,
        newDepotId: Long,
    )
}
