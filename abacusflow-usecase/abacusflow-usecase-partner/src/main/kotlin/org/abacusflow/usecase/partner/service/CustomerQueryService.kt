package org.abacusflow.usecase.partner.service

import org.abacusflow.usecase.partner.BasicCustomerTO
import org.abacusflow.usecase.partner.CustomerTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize

interface CustomerQueryService {
    @PreAuthorize("hasAuthority('customer:read')")
    fun getCustomer(id: Long): CustomerTO

    @PreAuthorize("hasAuthority('customer:read')")
    fun getCustomer(name: String): CustomerTO

    @PreAuthorize("hasAuthority('customer:read')")
    fun listBasicCustomersPage(
        pageable: Pageable,
        name: String?,
        phone: String?,
        address: String?,
    ): Page<BasicCustomerTO>

    @PreAuthorize("hasAuthority('customer:read')")
    fun listCustomers(): List<CustomerTO>
}
