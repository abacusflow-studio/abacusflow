package org.abacusflow.usecase.partner.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.partner.CreateSupplierInputTO
import org.abacusflow.usecase.partner.SupplierTO
import org.abacusflow.usecase.partner.UpdateSupplierInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface SupplierCommandService {
    @PreAuthorize(RequiredAuthority.BUSINESS_SUPPLIER_CREATE)
    fun createSupplier(supplier: CreateSupplierInputTO): SupplierTO

    @PreAuthorize(RequiredAuthority.BUSINESS_SUPPLIER_UPDATE)
    fun updateSupplier(
        id: Long,
        supplierTO: UpdateSupplierInputTO,
    ): SupplierTO

    @PreAuthorize(RequiredAuthority.BUSINESS_SUPPLIER_DELETE)
    fun deleteSupplier(id: Long): SupplierTO
}
