package org.abacusflow.usecase.product.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.product.CreateProductCategoryInputTO
import org.abacusflow.usecase.product.ProductCategoryTO
import org.abacusflow.usecase.product.UpdateProductCategoryInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface ProductCategoryCommandService {
    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_CATEGORY_CREATE)
    fun createProductCategory(input: CreateProductCategoryInputTO): ProductCategoryTO

    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_CATEGORY_UPDATE)
    fun updateProductCategory(
        id: Long,
        input: UpdateProductCategoryInputTO,
    ): ProductCategoryTO

    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_CATEGORY_DELETE)
    fun deleteProductCategory(id: Long): ProductCategoryTO
}
