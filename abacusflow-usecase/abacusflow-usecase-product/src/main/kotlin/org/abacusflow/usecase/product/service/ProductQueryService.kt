package org.abacusflow.usecase.product.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.product.BasicProductTO
import org.abacusflow.usecase.product.ProductTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize

interface ProductQueryService {
    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_READ)
    fun listBasicProductsPage(
        pageable: Pageable,
        name: String?,
        type: String?,
        enabled: Boolean?,
        categoryId: Long?,
    ): Page<BasicProductTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_READ)
    fun listProducts(): List<ProductTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_READ)
    fun getProduct(id: Long): ProductTO

    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_READ)
    fun getProduct(name: String): ProductTO
}
