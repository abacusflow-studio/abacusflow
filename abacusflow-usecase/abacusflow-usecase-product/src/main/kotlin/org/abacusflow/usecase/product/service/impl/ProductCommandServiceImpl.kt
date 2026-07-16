package org.abacusflow.usecase.product.service.impl

import org.abacusflow.db.product.ProductCategoryRepository
import org.abacusflow.db.product.ProductRepository
import org.abacusflow.product.Product
import org.abacusflow.product.service.ProductDeletionChecker
import org.abacusflow.usecase.product.CreateProductInputTO
import org.abacusflow.usecase.product.ProductTO
import org.abacusflow.usecase.product.UpdateProductInputTO
import org.abacusflow.usecase.product.mapper.mapProductTypeTOToDO
import org.abacusflow.usecase.product.mapper.mapProductUnitTOToDO
import org.abacusflow.usecase.product.mapper.toTO
import org.abacusflow.usecase.product.service.ProductCommandService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class ProductCommandServiceImpl(
    private val productRepository: ProductRepository,
    private val productCategoryRepository: ProductCategoryRepository,
    private val productDeletionChecker: ProductDeletionChecker,
) : ProductCommandService {
    override fun createProduct(input: CreateProductInputTO): ProductTO {
        input.barcode?.let { barcode ->
            require(!productRepository.existsByBarcode(barcode)) {
                "Product with barcode '$barcode' already exists in this tenant"
            }
        }

        val newProductCategory =
            productCategoryRepository.findById(input.categoryId)
                .orElseThrow { NoSuchElementException("ProductCategory not found with id: ${input.categoryId}") }

        val newProduct =
            Product(
                name = input.name,
                type = mapProductTypeTOToDO(input.type),
                barcode = input.barcode,
                unit = mapProductUnitTOToDO(input.unit),
                category = newProductCategory,
                specification = input.specification,
                note = input.note,
            )
        val product = productRepository.save(newProduct)
        return product.toTO()
    }

    override fun updateProduct(
        id: Long,
        input: UpdateProductInputTO,
    ): ProductTO {
        val product =
            productRepository.findById(id)
                .orElseThrow { NoSuchElementException("Product not found with id: $id") }

        product.apply {
            updateBasicInfo(
                newName = input.name,
                newSpecification = input.specification,
                newBarcode = input.barcode,
                newNote = input.note,
                newUnit = input.unit?.let { mapProductUnitTOToDO(it) },
            )

            input.categoryId?.let { categoryId ->
                val newProductCategory =
                    productCategoryRepository.findById(categoryId)
                        .orElseThrow { NoSuchElementException("ProductCategory not found with id: $categoryId") }

                changeCategory(newProductCategory)
            }
        }

        val updatedProduct = productRepository.saveAndFlush(product)

        return updatedProduct.toTO()
    }

    override fun deleteProduct(id: Long): ProductTO {
        val product =
            productRepository
                .findById(id)
                .orElseThrow { NoSuchElementException("Product not found with id: $id") }

        require(productDeletionChecker.canDelete(product)) {
            "该产品尚有关联库存、采购单或销售单，无法删除"
        }

        productRepository.delete(product)

        return product.toTO()
    }
}
