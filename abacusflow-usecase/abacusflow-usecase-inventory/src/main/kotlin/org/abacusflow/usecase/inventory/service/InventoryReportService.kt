package org.abacusflow.usecase.inventory.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.springframework.security.access.prepost.PreAuthorize

interface InventoryReportService {
    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_READ)
    fun exportInventoryAsPdf(productCategoryId: Long?): ByteArray

    @PreAuthorize(RequiredAuthority.BUSINESS_INVENTORY_READ)
    fun exportInventoryAsExcel(productCategoryId: Long?): ByteArray
}
