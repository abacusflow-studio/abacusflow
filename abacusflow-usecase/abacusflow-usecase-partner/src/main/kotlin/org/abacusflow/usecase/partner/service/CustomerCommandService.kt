package org.abacusflow.usecase.partner.service

import org.abacusflow.usecase.partner.CreateCustomerInputTO
import org.abacusflow.usecase.partner.CustomerTO
import org.abacusflow.usecase.partner.UpdateCustomerInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface CustomerCommandService {
    @PreAuthorize("hasAuthority('customer:create')")
    fun createCustomer(input: CreateCustomerInputTO): CustomerTO

    @PreAuthorize("hasAuthority('customer:update')")
    fun updateCustomer(
        id: Long,
        input: UpdateCustomerInputTO,
    ): CustomerTO

    @PreAuthorize("hasAuthority('customer:delete')")
    fun deleteCustomer(id: Long): CustomerTO
}
