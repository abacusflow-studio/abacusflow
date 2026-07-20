package org.abacusflow.usecase.product.service.impl

import org.abacusflow.commons.tenant.TenantContextHolder
import org.abacusflow.db.product.ProductCategoryRepository
import org.abacusflow.db.product.ProductRepository
import org.abacusflow.product.ProductCategory
import org.abacusflow.usecase.product.CreateProductCategoryInputTO
import org.abacusflow.usecase.product.UpdateProductCategoryInputTO
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertSame

class ProductCategoryCommandServiceImplTest {
    private lateinit var categoryRepository: ProductCategoryRepository
    private lateinit var productRepository: ProductRepository
    private lateinit var service: ProductCategoryCommandServiceImpl

    @BeforeEach
    fun setUp() {
        TenantContextHolder.setTenantId(1001)
        categoryRepository = mock(ProductCategoryRepository::class.java)
        productRepository = mock(ProductRepository::class.java)
        service = ProductCategoryCommandServiceImpl(categoryRepository, productRepository)
        `when`(categoryRepository.save(any(ProductCategory::class.java))).thenAnswer { it.arguments[0] }
    }

    @AfterEach
    fun clearTenantContext() {
        TenantContextHolder.clear()
    }

    @Test
    fun `create supports both top-level and child categories`() {
        val parent = category("食品")
        setId(parent, 101)
        `when`(categoryRepository.findById(101)).thenReturn(Optional.of(parent))

        val topLevel =
            service.createProductCategory(
                CreateProductCategoryInputTO("日用品", parentId = null, description = null),
            )
        val child =
            service.createProductCategory(
                CreateProductCategoryInputTO("饮料", parentId = 101, description = null),
            )

        assertNull(topLevel.parentId)
        assertEquals(101, child.parentId)
    }

    @Test
    fun `update moves a category to the top level or another valid branch`() {
        val originalParent = category("食品")
        val category = category("饮料", parent = originalParent)
        val newParent = category("促销专区")
        setId(category, 201)
        setId(newParent, 301)
        `when`(categoryRepository.findById(201)).thenReturn(Optional.of(category))
        `when`(categoryRepository.findById(301)).thenReturn(Optional.of(newParent))

        service.updateProductCategory(201, UpdateProductCategoryInputTO("饮品", null, "说明"))
        assertNull(category.parent)

        service.updateProductCategory(201, UpdateProductCategoryInputTO("饮品", 301, "说明"))
        assertSame(newParent, category.parent)
    }

    @Test
    fun `duplicate names are rejected before persistence`() {
        `when`(categoryRepository.existsByName("食品")).thenReturn(true)

        assertFailsWith<IllegalArgumentException> {
            service.createProductCategory(CreateProductCategoryInputTO("食品", null, null))
        }

        verify(categoryRepository, never()).save(any(ProductCategory::class.java))
    }

    @Test
    fun `a parent hidden by tenant isolation is rejected as unavailable`() {
        `when`(categoryRepository.findById(9999)).thenReturn(Optional.empty())

        assertFailsWith<NoSuchElementException> {
            service.createProductCategory(CreateProductCategoryInputTO("非法子类", 9999, null))
        }

        verify(categoryRepository, never()).save(any(ProductCategory::class.java))
    }

    @Test
    fun `self-parenting and descendant cycles are rejected before save`() {
        val root = category("食品")
        val child = category("饮料", root)
        val grandchild = category("茶", child)
        setId(root, 101)
        setId(grandchild, 103)
        `when`(categoryRepository.findById(101)).thenReturn(Optional.of(root))
        `when`(categoryRepository.findById(103)).thenReturn(Optional.of(grandchild))

        assertFailsWith<IllegalArgumentException> {
            service.updateProductCategory(101, UpdateProductCategoryInputTO("食品", 101, null))
        }
        assertFailsWith<IllegalArgumentException> {
            service.updateProductCategory(101, UpdateProductCategoryInputTO("食品", 103, null))
        }

        assertNull(root.parent)
        verify(categoryRepository, never()).save(any(ProductCategory::class.java))
    }

    @Test
    fun `delete protects child and product references but removes an unused leaf`() {
        val category = category("食品")
        setId(category, 101)
        `when`(categoryRepository.findById(101)).thenReturn(Optional.of(category))
        `when`(categoryRepository.existsByParentId(101)).thenReturn(true)

        assertFailsWith<IllegalArgumentException> { service.deleteProductCategory(101) }
        verify(categoryRepository, never()).delete(any(ProductCategory::class.java))

        `when`(categoryRepository.existsByParentId(101)).thenReturn(false)
        `when`(productRepository.countProductByCategoryId(101)).thenReturn(2)
        assertFailsWith<IllegalArgumentException> { service.deleteProductCategory(101) }
        verify(categoryRepository, never()).delete(any(ProductCategory::class.java))

        `when`(productRepository.countProductByCategoryId(101)).thenReturn(0)
        service.deleteProductCategory(101)
        verify(categoryRepository).delete(category)
    }

    private fun category(
        name: String,
        parent: ProductCategory? = null,
        tenantId: Long = 1001,
    ) = ProductCategory(name, null, parent, tenantId)

    private fun setId(
        category: ProductCategory,
        id: Long,
    ) {
        ProductCategory::class.java.getDeclaredField("id").apply {
            isAccessible = true
            setLong(category, id)
        }
    }
}
