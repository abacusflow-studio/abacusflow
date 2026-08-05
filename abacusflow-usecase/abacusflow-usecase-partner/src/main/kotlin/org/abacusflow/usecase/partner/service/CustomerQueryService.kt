package org.abacusflow.usecase.partner.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.partner.BasicCustomerTO
import org.abacusflow.usecase.partner.CustomerTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize

interface CustomerQueryService {
    @PreAuthorize(RequiredAuthority.BUSINESS_CUSTOMER_READ)
    fun getCustomer(id: Long): CustomerTO

    @PreAuthorize(RequiredAuthority.BUSINESS_CUSTOMER_READ)
    fun getCustomer(name: String): CustomerTO

    @PreAuthorize(RequiredAuthority.BUSINESS_CUSTOMER_READ)
    fun listBasicCustomersPage(
        pageable: Pageable,
        name: String?,
        phone: String?,
        address: String?,
    ): Page<BasicCustomerTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_CUSTOMER_READ)
    fun listCustomers(): List<CustomerTO>
}
