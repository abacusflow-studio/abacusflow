package org.abacusflow.portal.web.product

import org.abacusflow.portal.web.api.ProductCategoriesApi
import org.abacusflow.portal.web.model.BasicProductCategoryVO
import org.abacusflow.portal.web.model.CreateProductCategoryInputVO
import org.abacusflow.portal.web.model.ProductCategoryVO
import org.abacusflow.portal.web.model.SelectableProductCategoryVO
import org.abacusflow.portal.web.model.UpdateProductCategoryInputVO
import org.abacusflow.portal.web.product.mapper.toVO
import org.abacusflow.usecase.product.CreateProductCategoryInputTO
import org.abacusflow.usecase.product.UpdateProductCategoryInputTO
import org.abacusflow.usecase.product.service.ProductCategoryCommandService
import org.abacusflow.usecase.product.service.ProductCategoryQueryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class ProductCategoryController(
    private val productCategoryCommandService: ProductCategoryCommandService,
    private val productCategoryQueryService: ProductCategoryQueryService,
) : ProductCategoriesApi {
    override fun listBasicProductCategories(): ResponseEntity<List<BasicProductCategoryVO>> {
        val categories = productCategoryQueryService.listBasicProductCategories()
        val categoryVOs =
            categories.map { category ->
                category.toVO()
            }
        return ResponseEntity.ok(categoryVOs)
    }

    override fun listSelectableProductCategories(): ResponseEntity<List<SelectableProductCategoryVO>> {
        val productCategoryVOs =
            productCategoryQueryService.listProductCategories().map {
                SelectableProductCategoryVO(
                    it.id,
                    it.name,
                    it.parentId,
                    it.parentName,
                )
            }
        return ResponseEntity.ok(productCategoryVOs)
    }

    override fun getProductCategory(id: Long): ResponseEntity<ProductCategoryVO> {
        val category = productCategoryQueryService.getProductCategory(id)
        return ResponseEntity.ok(
            category.toVO(),
        )
    }

    override fun addProductCategory(createProductCategoryInputVO: CreateProductCategoryInputVO): ResponseEntity<ProductCategoryVO> {
        val category =
            productCategoryCommandService.createProductCategory(
                CreateProductCategoryInputTO(
                    name = createProductCategoryInputVO.name,
                    parentId = createProductCategoryInputVO.parentId,
                    description = createProductCategoryInputVO.description,
                ),
            )
        return ResponseEntity.ok(
            category.toVO(),
        )
    }

    override fun updateProductCategory(
        id: Long,
        updateProductCategoryInputVO: UpdateProductCategoryInputVO,
    ): ResponseEntity<ProductCategoryVO> {
        val category =
            productCategoryCommandService.updateProductCategory(
                id,
                UpdateProductCategoryInputTO(
                    name = updateProductCategoryInputVO.name,
                    parentId = updateProductCategoryInputVO.parentId,
                    description = updateProductCategoryInputVO.description,
                ),
            )
        return ResponseEntity.ok(
            category.toVO(),
        )
    }

    override fun deleteProductCategory(id: Long): ResponseEntity<Unit> {
        productCategoryCommandService.deleteProductCategory(id)
        return ResponseEntity.ok().build()
    }
}
