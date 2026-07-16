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
            productCategoryRepository
                .findById(input.parentId)
                .orElseThrow { NoSuchElementException("Product category not found with id: ${input.parentId}") }

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

        category.apply {
            updateBasicInfo(
                input.name,
                input.description,
            )

            input.parentId?.let { parentId ->
                val parentCategoryFromInput =
                    productCategoryRepository
                        .findById(parentId)
                        .orElseThrow { NoSuchElementException("Product category not found with id: $parentId") }

                changeParent(parentCategoryFromInput)
            }
        }

        return productCategoryRepository.save(category).toTO()
    }

    override fun deleteProductCategory(id: Long): ProductCategoryTO {
        val category =
            productCategoryRepository
                .findById(id)
                .orElseThrow { NoSuchElementException("Product category not found with id: $id") }

        val productCount = productRepository.countProductByCategoryId(id)
        require(productCount == 0) { "Cannot delete category: $productCount products are still associated" }

        productCategoryRepository.delete(category)
        return category.toTO()
    }
}
