package org.abacusflow.usecase.partner.service

import org.abacusflow.usecase.partner.CreateSupplierInputTO
import org.abacusflow.usecase.partner.SupplierTO
import org.abacusflow.usecase.partner.UpdateSupplierInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface SupplierCommandService {
    @PreAuthorize("hasAuthority('supplier:create')")
    fun createSupplier(supplier: CreateSupplierInputTO): SupplierTO

    @PreAuthorize("hasAuthority('supplier:update')")
    fun updateSupplier(
        id: Long,
        supplierTO: UpdateSupplierInputTO,
    ): SupplierTO

    @PreAuthorize("hasAuthority('supplier:delete')")
    fun deleteSupplier(id: Long): SupplierTO
}
