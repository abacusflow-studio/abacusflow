package org.abacusflow.usecase.product.service.impl

import org.abacusflow.db.product.ProductCategoryRepository
import org.abacusflow.db.product.ProductRepository
import org.abacusflow.product.ProductCategory
import org.abacusflow.usecase.product.CreateProductCategoryInputTO
import org.abacusflow.usecase.product.ProductCategoryTO
import org.abacusflow.usecase.product.UpdateProductCategoryInputTO
import org.abacusflow.usecase.product.mapper.toTO
import org.abacusflow.usecase.product.service.ProductCategoryCommandService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class ProductCategoryCommandServiceImpl(
    private val productCategoryRepository: ProductCategoryRepository,
    private val productRepository: ProductRepository,
) : ProductCategoryCommandService {
    override fun createProductCategory(input: CreateProductCategoryInputTO): ProductCategoryTO {
        require(!productCategoryRepository.existsByName(input.name)) {
            "Product category with name '${input.name}' already exists in this tenant"
        }

        val parentCategoryFromInput =
            input.parentId?.let { parentId ->
                productCategoryRepository
                    .findById(parentId)
                    .orElseThrow { NoSuchElementException("Product category not found with id: $parentId") }
            }
        // null parentId → top-level category

        val category =
            ProductCategory(
                name = input.name,
                parent = parentCategoryFromInput,
                description = input.description,
            )
        return productCategoryRepository.save(category).toTO()
    }

    override fun updateProductCategory(
        id: Long,
        input: UpdateProductCategoryInputTO,
    ): ProductCategoryTO {
        val category =
            productCategoryRepository
                .findById(id)
                .orElseThrow { NoSuchElementException("Product category not found with id: $id") }

        // Name uniqueness check excluding self
        require(!productCategoryRepository.existsByNameExcludingId(input.name, id)) {
            "Product category with name '${input.name}' already exists in this tenant"
        }

        // Resolve the target parent: null → top level, non-null → must exist in current tenant
        val targetParent =
            input.parentId?.let { parentId ->
                productCategoryRepository
                    .findById(parentId)
                    .orElseThrow { NoSuchElementException("Product category not found with id: $parentId") }
            }

        category.apply {
            // Validate the requested hierarchy before mutating the remaining PUT state.
            moveTo(targetParent)
            updateBasicInfo(
                input.name,
                input.description,
            )
        }

        return productCategoryRepository.save(category).toTO()
    }

    override fun deleteProductCategory(id: Long): ProductCategoryTO {
        val category =
            productCategoryRepository
                .findById(id)
                .orElseThrow { NoSuchElementException("Product category not found with id: $id") }

        // Reject if direct children exist
        require(!productCategoryRepository.existsByParentId(id)) {
            "Cannot delete category: it has child categories"
        }

        // Reject if products reference this category
        val productCount = productRepository.countProductByCategoryId(id)
        require(productCount == 0) { "Cannot delete category: $productCount products are still associated" }

        productCategoryRepository.delete(category)
        return category.toTO()
    }
}
