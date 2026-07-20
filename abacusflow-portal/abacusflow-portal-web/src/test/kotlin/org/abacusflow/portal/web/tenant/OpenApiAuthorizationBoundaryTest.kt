package org.abacusflow.portal.web.tenant

import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class OpenApiAuthorizationBoundaryTest {
    private val contract = requireNotNull(javaClass.getResource("/static/openapi.yaml")).readText()

    @Test
    fun `contract separates me tenant and platform control planes`() {
        listOf(
            "  /me/tenants:",
            "  /me/invitations/accept:",
            "  /tenant:",
            "  /tenant/members:",
            "  /tenant/roles:",
            "  /tenant/role-permissions:",
            "  /platform/tenants:",
            "  /platform/permissions:",
            "  /platform/roles:",
        ).forEach { path -> assertTrue(contract.contains(path), "Missing $path") }
    }

    @Test
    fun `contract exposes neither legacy self service tenant creation nor direct member add`() {
        assertFalse(contract.contains("\n  /tenants:"))
        assertFalse(contract.contains("operationId: createTenant\n"))
        assertFalse(contract.contains("operationId: addTenantMember"))
        assertFalse(contract.contains("AddTenantMemberInput:"))
    }

    @Test
    fun `contract uses tenant role names and canonical business authorities only`() {
        assertTrue(contract.contains("    TenantRole:"))
        assertTrue(contract.contains("    CreateTenantRoleInput:"))
        assertTrue(contract.contains("    UpdateTenantRoleInput:"))
        assertFalse(contract.contains("    Role:"))
        assertFalse(contract.contains("    CreateRoleInput:"))
        assertFalse(contract.contains("    UpdateRoleInput:"))

        val authorityExamples =
            Regex("(?:platform|tenant|business):[a-z][a-z0-9-]*:[a-z][a-z0-9]*")
                .findAll(contract)
                .map { it.value }
                .toSet()
        assertTrue("business:product:read" in authorityExamples)
        assertFalse(Regex("(?m)(?<![a-z:-])(?:product|inventory|depot|customer|supplier|feedback):[a-z]+(?!:)").containsMatchIn(contract))
    }

    @Test
    fun `permission catalog exposes no runtime create or delete contract`() {
        assertFalse(contract.contains("operationId: createPermission"))
        assertFalse(contract.contains("operationId: deletePermission"))
        assertFalse(contract.contains("    CreatePermissionInput:"))
    }
}
