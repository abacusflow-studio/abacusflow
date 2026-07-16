package org.abacusflow.usecase.product.service

import org.abacusflow.usecase.product.CreateProductCategoryInputTO
import org.abacusflow.usecase.product.ProductCategoryTO
import org.abacusflow.usecase.product.UpdateProductCategoryInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface ProductCategoryCommandService {
    @PreAuthorize("hasAuthority('product-category:create')")
    fun createProductCategory(input: CreateProductCategoryInputTO): ProductCategoryTO

    @PreAuthorize("hasAuthority('product-category:update')")
    fun updateProductCategory(
        id: Long,
        input: UpdateProductCategoryInputTO,
    ): ProductCategoryTO

    @PreAuthorize("hasAuthority('product-category:delete')")
    fun deleteProductCategory(id: Long): ProductCategoryTO
}
