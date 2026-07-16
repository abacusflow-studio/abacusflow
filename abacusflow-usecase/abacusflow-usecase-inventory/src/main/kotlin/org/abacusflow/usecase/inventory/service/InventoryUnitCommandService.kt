package org.abacusflow.usecase.inventory.service

import org.springframework.security.access.prepost.PreAuthorize

interface InventoryUnitCommandService {
    @PreAuthorize("hasAuthority('inventory-unit:update')")
    fun assignDepot(
        id: Long,
        newDepotId: Long,
    )
}
