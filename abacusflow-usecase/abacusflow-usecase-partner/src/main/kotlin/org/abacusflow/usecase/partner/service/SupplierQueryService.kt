package org.abacusflow.usecase.partner.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.partner.BasicSupplierTO
import org.abacusflow.usecase.partner.SupplierTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize

interface SupplierQueryService {
    @PreAuthorize(RequiredAuthority.BUSINESS_SUPPLIER_READ)
    fun getSupplier(id: Long): SupplierTO

    @PreAuthorize(RequiredAuthority.BUSINESS_SUPPLIER_READ)
    fun getSupplier(name: String): SupplierTO

    @PreAuthorize(RequiredAuthority.BUSINESS_SUPPLIER_READ)
    fun listBasicSuppliersPage(
        pageable: Pageable,
        name: String?,
        contactPerson: String?,
        phone: String?,
        address: String?,
    ): Page<BasicSupplierTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_SUPPLIER_READ)
    fun listSuppliers(): List<SupplierTO>
}
