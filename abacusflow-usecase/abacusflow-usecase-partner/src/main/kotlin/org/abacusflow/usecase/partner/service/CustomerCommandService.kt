package org.abacusflow.usecase.partner.service

import org.abacusflow.usecase.commons.security.RequiredAuthority

import org.abacusflow.usecase.partner.CreateCustomerInputTO
import org.abacusflow.usecase.partner.CustomerTO
import org.abacusflow.usecase.partner.UpdateCustomerInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface CustomerCommandService {
    @PreAuthorize(RequiredAuthority.BUSINESS_CUSTOMER_CREATE)
    fun createCustomer(input: CreateCustomerInputTO): CustomerTO

    @PreAuthorize(RequiredAuthority.BUSINESS_CUSTOMER_UPDATE)
    fun updateCustomer(
        id: Long,
        input: UpdateCustomerInputTO,
    ): CustomerTO

    @PreAuthorize(RequiredAuthority.BUSINESS_CUSTOMER_DELETE)
    fun deleteCustomer(id: Long): CustomerTO
}
