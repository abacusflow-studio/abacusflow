package org.abacusflow.usecase.inventory.service

import org.abacusflow.usecase.inventory.BasicInventoryUnitTO
import org.abacusflow.usecase.inventory.InventoryUnitForExportTO
import org.abacusflow.usecase.inventory.InventoryUnitTO
import org.abacusflow.usecase.inventory.InventoryUnitWithTitleTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize

interface InventoryUnitQueryService {
    @PreAuthorize("hasAuthority('inventory-unit:read')")
    fun listBasicInventoryUnits(
        pageable: Pageable,
        productCategoryId: Long?,
        productName: String?,
        productType: String?,
        inventoryUnitCode: String?,
        depotName: String?,
    ): Page<BasicInventoryUnitTO>

    @PreAuthorize("hasAuthority('inventory-unit:read')")
    fun listInventoryUnits(): List<InventoryUnitTO>

    @PreAuthorize("hasAuthority('inventory-unit:read')")
    fun listInventoryUnitsForExport(productCategoryId: Long?): List<InventoryUnitForExportTO>

    @PreAuthorize("hasAuthority('inventory-unit:read')")
    fun listInventoryUnitsWithTitle(statusList: List<String>? = null): List<InventoryUnitWithTitleTO>

    @PreAuthorize("hasAuthority('inventory-unit:read')")
    fun getInventoryUnit(id: Long): InventoryUnitTO?
}
