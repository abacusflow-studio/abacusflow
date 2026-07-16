package org.abacusflow.portal.web.product

import org.abacusflow.portal.web.api.ProductsApi
import org.abacusflow.portal.web.model.CreateProductInputVO
import org.abacusflow.portal.web.model.ListBasicProductsPage200ResponseVO
import org.abacusflow.portal.web.model.ProductTypeVO
import org.abacusflow.portal.web.model.ProductVO
import org.abacusflow.portal.web.model.SelectableProductVO
import org.abacusflow.portal.web.model.UpdateProductInputVO
import org.abacusflow.portal.web.product.mapper.mapProductTypeTOToVO
import org.abacusflow.portal.web.product.mapper.toBasicVO
import org.abacusflow.portal.web.product.mapper.toVO
import org.abacusflow.usecase.product.CreateProductInputTO
import org.abacusflow.usecase.product.UpdateProductInputTO
import org.abacusflow.usecase.product.service.ProductCommandService
import org.abacusflow.usecase.product.service.ProductQueryService
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class ProductController(
    private val productCommandService: ProductCommandService,
    private val productQueryService: ProductQueryService,
) : ProductsApi {
    override fun listBasicProductsPage(
        pageIndex: Int,
        pageSize: Int,
        name: String?,
        type: ProductTypeVO?,
        enabled: Boolean?,
        categoryId: Long?,
    ): ResponseEntity<ListBasicProductsPage200ResponseVO> {
        val pageable = PageRequest.of(pageIndex - 1, pageSize)

        val page =
            productQueryService.listBasicProductsPage(
                pageable,
                name = name,
                type = type?.name?.uppercase(),
                enabled = enabled,
                categoryId = categoryId,
            ).map { it.toBasicVO() }

        val pageVO =
            ListBasicProductsPage200ResponseVO(
                content = page.content,
                totalElements = page.totalElements,
                number = page.number,
                propertySize = page.size,
            )

        return ResponseEntity.ok(pageVO)
    }

    override fun getProduct(id: Long): ResponseEntity<ProductVO> {
        val product = productQueryService.getProduct(id)
        return ResponseEntity.ok(
            product.toVO(),
        )
    }

    override fun addProduct(createProductInputVO: CreateProductInputVO): ResponseEntity<ProductVO> {
        val product =
            productCommandService.createProduct(
                CreateProductInputTO(
                    name = createProductInputVO.name,
                    type = createProductInputVO.type.name,
                    barcode = createProductInputVO.barcode,
                    specification = createProductInputVO.specification,
                    categoryId = createProductInputVO.categoryId,
                    unit = createProductInputVO.unit.name,
                    note = createProductInputVO.note,
                ),
            )
        return ResponseEntity.ok(
            product.toVO(),
        )
    }

    override fun updateProduct(
        id: Long,
        updateProductInputVO: UpdateProductInputVO,
    ): ResponseEntity<ProductVO> {
        val product =
            productCommandService.updateProduct(
                id,
                UpdateProductInputTO(
                    name = updateProductInputVO.name,
                    type = updateProductInputVO.type?.name,
                    barcode = updateProductInputVO.barcode,
                    specification = updateProductInputVO.specification,
                    categoryId = updateProductInputVO.categoryId,
                    unit = updateProductInputVO.unit?.name,
                    note = updateProductInputVO.note,
                ),
            )
        return ResponseEntity.ok(
            product.toVO(),
        )
    }

    override fun deleteProduct(id: Long): ResponseEntity<Unit> {
        productCommandService.deleteProduct(id)
        return ResponseEntity.ok().build()
    }

    override fun listSelectableProducts(): ResponseEntity<List<SelectableProductVO>> {
        val productVOs =
            productQueryService.listProducts().map {
                SelectableProductVO(
                    it.id,
                    it.name,
                    type = mapProductTypeTOToVO(it.type),
                    it.barcode,
                )
            }
        return ResponseEntity.ok(productVOs)
    }
}
