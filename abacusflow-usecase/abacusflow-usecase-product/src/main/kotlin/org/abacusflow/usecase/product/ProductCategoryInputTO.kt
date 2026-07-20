package org.abacusflow.usecase.product

data class CreateProductCategoryInputTO(
    val name: String,
    /** null or omitted → top-level category; non-null → child of the specified parent */
    val parentId: Long? = null,
    val description: String?,
)

data class UpdateProductCategoryInputTO(
    val name: String,
    /** Explicit nullable: null → move to top level; non-null → move under the specified parent */
    val parentId: Long?,
    val description: String?,
)
