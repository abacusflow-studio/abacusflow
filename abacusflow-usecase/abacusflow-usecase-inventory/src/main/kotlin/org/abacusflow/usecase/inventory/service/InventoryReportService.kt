package org.abacusflow.usecase.inventory.service

import org.springframework.security.access.prepost.PreAuthorize

interface InventoryReportService {
    @PreAuthorize("hasAuthority('inventory:read')")
    fun exportInventoryAsPdf(productCategoryId: Long?): ByteArray

    @PreAuthorize("hasAuthority('inventory:read')")
    fun exportInventoryAsExcel(productCategoryId: Long?): ByteArray
}
