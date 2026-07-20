package org.abacusflow.portal.web.product

import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ProductCategoryOpenApiContractTest {
    private val contract = requireNotNull(javaClass.getResource("/static/openapi.yaml")).readText()

    @Test
    fun `create accepts an omitted or null parent`() {
        val schema = schema("CreateProductCategoryInput")
        val required = schema.substringBefore("      properties:")

        assertTrue(required.contains("        - name"))
        assertFalse(required.contains("        - parentId"))
        assertTrue(nullableParentProperty(schema))
        assertTrue(schema.contains("省略或 null 表示创建顶级分类"))
    }

    @Test
    fun `put requires an explicitly nullable parent`() {
        val schema = schema("UpdateProductCategoryInput")
        val required = schema.substringBefore("      properties:")

        assertTrue(required.contains("        - name"))
        assertTrue(required.contains("        - parentId"))
        assertTrue(nullableParentProperty(schema))
    }

    @Test
    fun `category responses expose nullable real parent references and no virtual root model`() {
        assertTrue(nullableParentProperty(schema("ProductCategory")))
        assertTrue(nullableParentProperty(schema("SelectableProductCategory")))
        assertFalse(contract.contains("VirtualProductCategory"))
        assertFalse(contract.contains("virtualRoot", ignoreCase = true))
        assertFalse(contract.contains("fabricatedRoot", ignoreCase = true))
    }

    private fun nullableParentProperty(schema: String): Boolean =
        Regex("(?ms)^        parentId:\\r?\\n.*?^          nullable: true$").containsMatchIn(schema)

    private fun schema(name: String): String =
        requireNotNull(
            Regex(
                "(?ms)^    ${Regex.escape(name)}:\\r?\\n(.*?)(?=^    [A-Za-z][A-Za-z0-9]*:\\r?\\n|\\z)",
            ).find(contract),
        ) { "Missing OpenAPI schema $name" }.groupValues[1]
}
