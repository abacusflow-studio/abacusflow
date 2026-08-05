package org.abacusflow.usecase.inventory.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.inventory.CreateInventoryInputTO
import org.abacusflow.usecase.inventory.InventoryTO
import org.springframework.security.access.prepost.PreAuthorize

interface InventoryCommandService {
    fun createInventory(input: CreateInventoryInputTO): InventoryTO

    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_UPDATE)
    fun adjustWarningLine(
        id: Long,
        newSafetyStock: Long,
        newMaxStock: Long,
    )

    fun checkSafetyStock(id: Long): Boolean
}
