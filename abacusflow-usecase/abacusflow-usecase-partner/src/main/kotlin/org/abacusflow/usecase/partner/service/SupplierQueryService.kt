package org.abacusflow.usecase.partner.service

import org.abacusflow.usecase.partner.BasicSupplierTO
import org.abacusflow.usecase.partner.SupplierTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize

interface SupplierQueryService {
    @PreAuthorize("hasAuthority('supplier:read')")
    fun getSupplier(id: Long): SupplierTO

    @PreAuthorize("hasAuthority('supplier:read')")
    fun getSupplier(name: String): SupplierTO

    @PreAuthorize("hasAuthority('supplier:read')")
    fun listBasicSuppliersPage(
        pageable: Pageable,
        name: String?,
        contactPerson: String?,
        phone: String?,
        address: String?,
    ): Page<BasicSupplierTO>

    @PreAuthorize("hasAuthority('supplier:read')")
    fun listSuppliers(): List<SupplierTO>
}
