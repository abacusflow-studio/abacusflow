package org.abacusflow.usecase.product.service

import org.abacusflow.usecase.product.CreateProductInputTO
import org.abacusflow.usecase.product.ProductTO
import org.abacusflow.usecase.product.UpdateProductInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface ProductCommandService {
    @PreAuthorize("hasAuthority('product:create')")
    fun createProduct(input: CreateProductInputTO): ProductTO

    @PreAuthorize("hasAuthority('product:update')")
    fun updateProduct(
        id: Long,
        input: UpdateProductInputTO,
    ): ProductTO

    @PreAuthorize("hasAuthority('product:delete')")
    fun deleteProduct(id: Long): ProductTO
}
