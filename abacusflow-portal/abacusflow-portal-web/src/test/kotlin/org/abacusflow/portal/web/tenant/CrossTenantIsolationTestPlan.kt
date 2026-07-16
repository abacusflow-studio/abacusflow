package org.abacusflow.portal.web.tenant

/**
 * Cross-Tenant Isolation Test Plan
 *
 * This document lists the manual and integration test scenarios that verify
 * cross-tenant data isolation in AbacusFlow. These scenarios should be run
 * against a running instance with RLS enabled (V010 migration applied).
 *
 * Prerequisites:
 * - Two tenants exist: Tenant A (id=1001) and Tenant B (id=1002)
 * - Each tenant has at least one user with admin role
 * - RLS policies are active on all business tables
 *
 * ─────────────────────────────────────────────────────────────
 * 1. Product Isolation
 * ─────────────────────────────────────────────────────────────
 *
 * 1.1 Tenant A cannot read Tenant B's products
 *     - Create a product under Tenant A context
 *     - Switch to Tenant B context
 *     - Attempt to GET /products/{id} with Tenant A's product ID
 *     - Expected: 404 Not Found (RLS hides the row)
 *
 * 1.2 Tenant A cannot update Tenant B's products
 *     - Create a product under Tenant B context
 *     - Switch to Tenant A context
 *     - Attempt to PUT /products/{id} with Tenant B's product ID
 *     - Expected: 404 Not Found
 *
 * 1.3 Tenant A cannot delete Tenant B's products
 *     - Create a product under Tenant B context
 *     - Switch to Tenant A context
 *     - Attempt to DELETE /products/{id} with Tenant B's product ID
 *     - Expected: 404 Not Found
 *
 * 1.4 Different tenants can use the same barcode
 *     - Create a product with barcode "SHARED-001" under Tenant A
 *     - Create a product with barcode "SHARED-001" under Tenant B
 *     - Expected: Both succeed (tenant-scoped unique constraint)
 *
 * ─────────────────────────────────────────────────────────────
 * 2. Inventory Isolation
 * ─────────────────────────────────────────────────────────────
 *
 * 2.1 Tenant A cannot see Tenant B's inventory units
 *     - Create inventory under Tenant B
 *     - List inventory units under Tenant A context
 *     - Expected: Tenant B's inventory units are not visible
 *
 * 2.2 Tenant A cannot adjust Tenant B's inventory
 *     - Attempt to update inventory unit belonging to Tenant B
 *     - Expected: 404 Not Found
 *
 * ─────────────────────────────────────────────────────────────
 * 3. Partner Isolation (Customer/Supplier)
 * ─────────────────────────────────────────────────────────────
 *
 * 3.1 Tenant A cannot see Tenant B's customers
 *     - Create a customer under Tenant B
 *     - List customers under Tenant A context
 *     - Expected: Tenant B's customer is not visible
 *
 * 3.2 Tenant A cannot see Tenant B's suppliers
 *     - Same pattern as 3.1 for suppliers
 *
 * ─────────────────────────────────────────────────────────────
 * 4. Transaction Isolation (Purchase/Sale Orders)
 * ─────────────────────────────────────────────────────────────
 *
 * 4.1 Tenant A cannot see Tenant B's purchase orders
 *     - Create a purchase order under Tenant B
 *     - List purchase orders under Tenant A context
 *     - Expected: Tenant B's orders are not visible
 *
 * 4.2 Tenant A cannot see Tenant B's sale orders
 *     - Same pattern as 4.1 for sale orders
 *
 * ─────────────────────────────────────────────────────────────
 * 5. Depot Isolation
 * ─────────────────────────────────────────────────────────────
 *
 * 5.1 Tenant A cannot see Tenant B's depots
 *     - Create a depot under Tenant B
 *     - List depots under Tenant A context
 *     - Expected: Tenant B's depot is not visible
 *
 * ─────────────────────────────────────────────────────────────
 * 6. Role Isolation
 * ─────────────────────────────────────────────────────────────
 *
 * 6.1 Different tenants can have roles with the same name
 *     - Create a role named "manager" under Tenant A
 *     - Create a role named "manager" under Tenant B
 *     - Expected: Both succeed (tenant-scoped unique constraint on role name)
 *
 * 6.2 Tenant A cannot assign Tenant B's roles to its members
 *     - Attempt to add a role belonging to Tenant B to Tenant A's membership
 *     - Expected: RLS prevents access to Tenant B's role
 *
 * ─────────────────────────────────────────────────────────────
 * 7. Tenant Context Filter
 * ─────────────────────────────────────────────────────────────
 *
 * 7.1 Missing X-Tenant-Id header for multi-tenant user
 *     - User belongs to both Tenant A and Tenant B
 *     - Make request without X-Tenant-Id header
 *     - Expected: No tenant context set; tenant-scoped queries return empty
 *
 * 7.2 Invalid X-Tenant-Id header
 *     - Send "abc" as X-Tenant-Id
 *     - Expected: 400 Bad Request
 *
 * 7.3 X-Tenant-Id for tenant user does not belong to
 *     - User belongs to Tenant A only
 *     - Send X-Tenant-Id: 1002 (Tenant B)
 *     - Expected: 403 Forbidden
 *
 * 7.4 Single-tenant user auto-selection
 *     - User belongs to only Tenant A
 *     - Make request without X-Tenant-Id header
 *     - Expected: Tenant A is auto-selected; data is visible
 *
 * ─────────────────────────────────────────────────────────────
 * 8. CurrentTenantProvider Thread Safety
 * ─────────────────────────────────────────────────────────────
 *
 * 8.1 Concurrent requests with different tenants
 *     - Simulate two concurrent requests with different X-Tenant-Id headers
 *     - Expected: Each request sees only its own tenant's data
 *     - No cross-contamination between threads
 *
 * 8.2 Tenant context cleared after request
 *     - Make a request with X-Tenant-Id header
 *     - After request completes, check CurrentTenantProvider
 *     - Expected: No tenant context remains
 */
object CrossTenantIsolationTestPlan
