package org.abacusflow.usecase.inventory.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.inventory.BasicInventoryTO
import org.abacusflow.usecase.inventory.InventoryTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize

interface InventoryQueryService {
    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_READ)
    fun listBasicInventoriesPage(
        pageable: Pageable,
        productCategoryId: Long?,
        productName: String?,
        productType: String?,
        inventoryUnitCode: String?,
        depotName: String?,
    ): Page<BasicInventoryTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_READ)
    fun getInventory(id: Long): InventoryTO
}
