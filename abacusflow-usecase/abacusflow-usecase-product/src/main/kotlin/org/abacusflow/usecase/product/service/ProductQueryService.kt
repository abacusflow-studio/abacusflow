package org.abacusflow.usecase.product.service

import org.abacusflow.usecase.product.BasicProductTO
import org.abacusflow.usecase.product.ProductTO
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize

interface ProductQueryService {
    @PreAuthorize("hasAuthority('product:read')")
    fun listBasicProductsPage(
        pageable: Pageable,
        name: String?,
        type: String?,
        enabled: Boolean?,
        categoryId: Long?,
    ): Page<BasicProductTO>

    @PreAuthorize("hasAuthority('product:read')")
    fun listProducts(): List<ProductTO>

    @PreAuthorize("hasAuthority('product:read')")
    fun getProduct(id: Long): ProductTO

    @PreAuthorize("hasAuthority('product:read')")
    fun getProduct(name: String): ProductTO
}
