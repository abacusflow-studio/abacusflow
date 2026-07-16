package org.abacusflow.usecase.product.service

import org.abacusflow.usecase.product.BasicProductCategoryTO
import org.abacusflow.usecase.product.ProductCategoryTO
import org.springframework.security.access.prepost.PreAuthorize

interface ProductCategoryQueryService {
    @PreAuthorize("hasAuthority('product-category:read')")
    fun getProductCategory(id: Long): ProductCategoryTO

    @PreAuthorize("hasAuthority('product-category:read')")
    fun listBasicProductCategories(): List<BasicProductCategoryTO>

    @PreAuthorize("hasAuthority('product-category:read')")
    fun listProductCategories(): List<ProductCategoryTO>
}
