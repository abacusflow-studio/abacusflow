package org.abacusflow.usecase.inventory.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.inventory.BasicInventoryUnitTO
import org.abacusflow.usecase.inventory.InventoryUnitForExportTO
import org.abacusflow.usecase.inventory.InventoryUnitTO
import org.abacusflow.usecase.inventory.InventoryUnitWithTitleTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize

interface InventoryUnitQueryService {
    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_UNIT_READ)
    fun listBasicInventoryUnits(
        pageable: Pageable,
        productCategoryId: Long?,
        productName: String?,
        productType: String?,
        inventoryUnitCode: String?,
        depotName: String?,
    ): Page<BasicInventoryUnitTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_UNIT_READ)
    fun listInventoryUnits(): List<InventoryUnitTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_UNIT_READ)
    fun listInventoryUnitsForExport(productCategoryId: Long?): List<InventoryUnitForExportTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_UNIT_READ)
    fun listInventoryUnitsWithTitle(statusList: List<String>? = null): List<InventoryUnitWithTitleTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_UNIT_READ)
    fun getInventoryUnit(id: Long): InventoryUnitTO?
}
