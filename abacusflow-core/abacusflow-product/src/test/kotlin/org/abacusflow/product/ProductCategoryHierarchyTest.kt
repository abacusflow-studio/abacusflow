package org.abacusflow.product

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertSame

class ProductCategoryHierarchyTest {
    @Test
    fun `categories may be created at the top level or below a same-tenant parent`() {
        val topLevel = category("食品")
        val child = category("饮料", parent = topLevel)

        assertNull(topLevel.parent)
        assertSame(topLevel, child.parent)
    }

    @Test
    fun `category can move to another branch and back to the top level`() {
        val originalParent = category("食品")
        val newParent = category("促销专区")
        val child = category("饮料", parent = originalParent)

        child.moveTo(newParent)
        assertSame(newParent, child.parent)

        child.moveTo(null)
        assertNull(child.parent)
    }

    @Test
    fun `category rejects itself as parent without changing its hierarchy`() {
        val category = category("食品")

        assertFailsWith<IllegalArgumentException> { category.moveTo(category) }

        assertNull(category.parent)
    }

    @Test
    fun `category rejects a move below a multi-level descendant`() {
        val root = category("食品")
        val child = category("饮料", parent = root)
        val grandchild = category("茶", parent = child)

        assertFailsWith<IllegalArgumentException> { root.moveTo(grandchild) }

        assertNull(root.parent)
        assertSame(root, child.parent)
        assertSame(child, grandchild.parent)
    }

    @Test
    fun `category rejects a parent from another tenant on create and move`() {
        val tenantA = category("食品", tenantId = 1001)
        val tenantB = category("其他租户", tenantId = 2001)

        assertFailsWith<IllegalArgumentException> {
            category("非法子类", parent = tenantB, tenantId = 1001)
        }
        val error = assertFailsWith<IllegalArgumentException> { tenantA.moveTo(tenantB) }

        assertEquals("Cannot move a category under a parent from a different tenant", error.message)
        assertNull(tenantA.parent)
    }

    private fun category(
        name: String,
        parent: ProductCategory? = null,
        tenantId: Long = 1001,
    ) = ProductCategory(name = name, description = null, parent = parent, tenantId = tenantId)
}
