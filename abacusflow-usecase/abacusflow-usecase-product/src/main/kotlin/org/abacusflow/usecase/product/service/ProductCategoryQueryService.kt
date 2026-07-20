package org.abacusflow.usecase.product.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.product.BasicProductCategoryTO
import org.abacusflow.usecase.product.ProductCategoryTO
import org.springframework.security.access.prepost.PreAuthorize

interface ProductCategoryQueryService {
    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_CATEGORY_READ)
    fun getProductCategory(id: Long): ProductCategoryTO

    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_CATEGORY_READ)
    fun listBasicProductCategories(): List<BasicProductCategoryTO>

    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_CATEGORY_READ)
    fun listProductCategories(): List<ProductCategoryTO>
}
