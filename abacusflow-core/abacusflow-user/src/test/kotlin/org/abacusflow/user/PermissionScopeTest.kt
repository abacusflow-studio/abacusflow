package org.abacusflow.user

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow
import org.junit.jupiter.api.assertThrows

class PermissionScopeTest {
    // ── Valid canonical keys ────────────────────────────────

    @Test
    fun `platform prefix maps to PLATFORM`() {
        assertEquals(PermissionScope.PLATFORM, PermissionScope.fromName("platform:tenant:list"))
        assertEquals(PermissionScope.PLATFORM, PermissionScope.fromName("platform:role:manage"))
    }

    @Test
    fun `tenant prefix maps to TENANT`() {
        assertEquals(PermissionScope.TENANT, PermissionScope.fromName("tenant:member:read"))
        assertEquals(PermissionScope.TENANT, PermissionScope.fromName("tenant:profile:update"))
    }

    @Test
    fun `business prefix maps to BUSINESS`() {
        assertEquals(PermissionScope.BUSINESS, PermissionScope.fromName("business:product:read"))
        assertEquals(PermissionScope.BUSINESS, PermissionScope.fromName("business:inventory:adjust"))
        assertEquals(PermissionScope.BUSINESS, PermissionScope.fromName("business:purchase-order:approve"))
    }

    @Test
    fun `compound resource names are valid`() {
        assertEquals(PermissionScope.BUSINESS, PermissionScope.fromName("business:product-category:read"))
        assertEquals(PermissionScope.BUSINESS, PermissionScope.fromName("business:inventory-unit:update"))
        assertEquals(PermissionScope.BUSINESS, PermissionScope.fromName("business:sale-order:create"))
        assertEquals(PermissionScope.BUSINESS, PermissionScope.fromName("business:purchase-order:approve"))
    }

    // ── Unknown scope prefix ────────────────────────────────

    @Test
    fun `unknown prefix is rejected`() {
        val ex =
            assertThrows<IllegalArgumentException> {
                PermissionScope.fromName("platfrom:user:manage")
            }
        assertTrue(ex.message!!.contains("Unknown permission scope prefix"))
    }

    @Test
    fun `legacy two-segment key is rejected`() {
        assertThrows<IllegalArgumentException> {
            PermissionScope.fromName("product:read")
        }
    }

    @Test
    fun `default-to-BUSINESS fallback is removed`() {
        // This is the critical test: the old `else -> BUSINESS` is gone.
        // Any key that doesn't start with platform:/tenant:/business: must be rejected.
        assertThrows<IllegalArgumentException> {
            PermissionScope.fromName("inventory:read")
        }
        assertThrows<IllegalArgumentException> {
            PermissionScope.fromName("depot:create")
        }
    }

    // ── Malformed keys ──────────────────────────────────────

    @Test
    fun `missing resource segment is rejected`() {
        assertThrows<IllegalArgumentException> {
            PermissionScope.fromName("platform:manage")
        }
    }

    @Test
    fun `missing action segment is rejected`() {
        assertThrows<IllegalArgumentException> {
            PermissionScope.fromName("platform:tenant")
        }
    }

    @Test
    fun `uppercase scope is rejected`() {
        assertThrows<IllegalArgumentException> {
            PermissionScope.fromName("Platform:tenant:list")
        }
    }

    @Test
    fun `uppercase resource is rejected`() {
        assertThrows<IllegalArgumentException> {
            PermissionScope.fromName("platform:Tenant:list")
        }
    }

    @Test
    fun `uppercase action is rejected`() {
        assertThrows<IllegalArgumentException> {
            PermissionScope.fromName("platform:tenant:List")
        }
    }

    @Test
    fun `extra segments are rejected`() {
        assertThrows<IllegalArgumentException> {
            PermissionScope.fromName("platform:tenant:list:extra")
        }
    }

    @Test
    fun `empty name is rejected`() {
        assertThrows<IllegalArgumentException> {
            PermissionScope.fromName("")
        }
    }

    // ── fromNameOrNull ──────────────────────────────────────

    @Test
    fun `fromNameOrNull returns scope for valid key`() {
        assertEquals(PermissionScope.PLATFORM, PermissionScope.fromNameOrNull("platform:tenant:list"))
        assertEquals(PermissionScope.TENANT, PermissionScope.fromNameOrNull("tenant:member:read"))
        assertEquals(PermissionScope.BUSINESS, PermissionScope.fromNameOrNull("business:product:read"))
    }

    @Test
    fun `fromNameOrNull returns null for invalid key`() {
        assertNull(PermissionScope.fromNameOrNull("product:read"))
        assertNull(PermissionScope.fromNameOrNull("platfrom:user:manage"))
        assertNull(PermissionScope.fromNameOrNull(""))
    }

    // ── validateName ────────────────────────────────────────

    @Test
    fun `validateName returns success for valid key`() {
        val result = PermissionScope.validateName("business:product:read")
        assertTrue(result.isSuccess)
        assertEquals(PermissionScope.BUSINESS, result.getOrNull())
    }

    @Test
    fun `validateName returns failure for invalid key`() {
        val result = PermissionScope.validateName("product:read")
        assertTrue(result.isFailure)
    }

    // ── Permission entity creation ──────────────────────────

    @Test
    fun `Permission create factory derives scope from name`() {
        val permission = Permission.create("business:product:read", "查看产品", "允许查看产品")
        assertEquals(PermissionScope.BUSINESS, permission.scope)
        assertEquals("business:product:read", permission.name)
    }

    @Test
    fun `Permission create rejects invalid name`() {
        assertThrows<IllegalArgumentException> {
            Permission.create("product:read", "查看产品", "允许查看产品")
        }
    }

    @Test
    fun `Permission init accepts consistent scope`() {
        assertDoesNotThrow {
            Permission("business:product:read", "查看产品", "允许查看产品", PermissionScope.BUSINESS)
        }
    }

    @Test
    fun `Permission init rejects mismatched scope`() {
        assertThrows<IllegalArgumentException> {
            Permission("platform:tenant:list", "查看租户", "desc", PermissionScope.BUSINESS)
        }
    }
}
