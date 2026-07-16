package org.abacusflow.portal.web.partner

import org.abacusflow.portal.web.api.CustomersApi
import org.abacusflow.portal.web.model.CreateCustomerInputVO
import org.abacusflow.portal.web.model.CustomerVO
import org.abacusflow.portal.web.model.ListBasicCustomersPage200ResponseVO
import org.abacusflow.portal.web.model.SelectableCustomerVO
import org.abacusflow.portal.web.model.UpdateCustomerInputVO
import org.abacusflow.usecase.partner.CreateCustomerInputTO
import org.abacusflow.usecase.partner.UpdateCustomerInputTO
import org.abacusflow.usecase.partner.service.CustomerCommandService
import org.abacusflow.usecase.partner.service.CustomerQueryService
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class CustomerController(
    private val customerCommandService: CustomerCommandService,
    private val customerQueryService: CustomerQueryService,
) : CustomersApi {
    override fun listBasicCustomersPage(
        pageIndex: Int,
        pageSize: Int,
        name: String?,
        phone: String?,
        address: String?,
    ): ResponseEntity<ListBasicCustomersPage200ResponseVO> {
        val pageable = PageRequest.of(pageIndex - 1, pageSize)

        val page =
            customerQueryService.listBasicCustomersPage(
                pageable,
                name = name,
                phone = phone,
                address = address,
            ).map { it.toBasicVO() }

        val pageVO =
            ListBasicCustomersPage200ResponseVO(
                content = page.content,
                totalElements = page.totalElements,
                number = page.number,
                propertySize = page.size,
            )

        return ResponseEntity.ok(pageVO)
    }

    override fun getCustomer(id: Long): ResponseEntity<CustomerVO> {
        val customer = customerQueryService.getCustomer(id)
        return ResponseEntity.ok(
            customer.toVO(),
        )
    }

    override fun addCustomer(createCustomerInputVO: CreateCustomerInputVO): ResponseEntity<CustomerVO> {
        val customer =
            customerCommandService.createCustomer(
                CreateCustomerInputTO(
                    name = createCustomerInputVO.name,
                    phone = createCustomerInputVO.phone,
                    address = createCustomerInputVO.address,
                ),
            )
        return ResponseEntity.ok(
            customer.toVO(),
        )
    }

    override fun updateCustomer(
        id: Long,
        updateCustomerInputVO: UpdateCustomerInputVO,
    ): ResponseEntity<CustomerVO> {
        val customer =
            customerCommandService.updateCustomer(
                id,
                UpdateCustomerInputTO(
                    name = updateCustomerInputVO.name,
                    phone = updateCustomerInputVO.phone,
                    address = updateCustomerInputVO.address,
                ),
            )
        return ResponseEntity.ok(
            customer.toVO(),
        )
    }

    override fun deleteCustomer(id: Long): ResponseEntity<Unit> {
        customerCommandService.deleteCustomer(id)
        return ResponseEntity.ok().build()
    }

    override fun listSelectableCustomers(): ResponseEntity<List<SelectableCustomerVO>> {
        val productVOs =
            customerQueryService.listCustomers().map {
                SelectableCustomerVO(
                    it.id,
                    it.name,
                )
            }
        return ResponseEntity.ok(productVOs)
    }
}
