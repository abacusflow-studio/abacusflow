package org.abacusflow.usecase.product.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.product.CreateProductInputTO
import org.abacusflow.usecase.product.ProductTO
import org.abacusflow.usecase.product.UpdateProductInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface ProductCommandService {
    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_CREATE)
    fun createProduct(input: CreateProductInputTO): ProductTO

    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_UPDATE)
    fun updateProduct(
        id: Long,
        input: UpdateProductInputTO,
    ): ProductTO

    @PreAuthorize(RequiredAuthority.BUSINESS_PRODUCT_DELETE)
    fun deleteProduct(id: Long): ProductTO
}
