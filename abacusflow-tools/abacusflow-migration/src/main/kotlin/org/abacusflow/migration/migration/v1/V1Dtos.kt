package org.abacusflow.migration.migration.v1

import java.time.Instant

/** V1 user_account 表的 DTO。V1 无 tenant_id。 */
data class V1UserAccount(
    val id: Long,
    val age: Int,
    val enabled: Boolean,
    val locked: Boolean,
    val name: String,
    val nick: String?,
    val password: String,
    val sex: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 user_external_identity 表的 DTO。 */
data class V1ExternalIdentity(
    val id: Long,
    val issuer: String,
    val subject: String,
    val userId: Long,
    val email: String?,
    val displayName: String?,
    val provider: String?,
    val emailVerified: Boolean = false,
    val pictureUrl: String?,
    val lastLoginAt: Instant?,
    val profileSyncedAt: Instant?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 role 表的 DTO。V1 角色是全局的，无 tenant_id。 */
data class V1Role(
    val id: Long,
    val name: String,
    val label: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 permission 表的 DTO。V1 无 scope 列。 */
data class V1Permission(
    val id: Long,
    val name: String,
    val label: String,
    val description: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 role_permission 关联表的 DTO。 */
data class V1RolePermission(
    val roleId: Long,
    val permissionId: Long,
)

/** V1 user_role 关联表的 DTO。 */
data class V1UserRole(
    val userId: Long,
    val roleId: Long,
)

/** V1 product_category 表的 DTO。V1 无 tenant_id。 */
data class V1ProductCategory(
    val id: Long,
    val name: String,
    val description: String?,
    val parentId: Long?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 product 表的 DTO。V1 无 tenant_id。 */
data class V1Product(
    val id: Long,
    val name: String,
    val specification: String?,
    val barcode: String,
    val type: String?,
    val unit: String,
    val note: String?,
    val enabled: Boolean,
    val categoryId: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 depot 表的 DTO。V1 无 tenant_id。 */
data class V1Depot(
    val id: Long,
    val name: String,
    val location: String?,
    val capacity: Int,
    val enabled: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 inventory 表的 DTO。V1 无 tenant_id。 */
data class V1Inventory(
    val id: Long,
    val maxStock: Long,
    val productId: Long,
    val safetyStock: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 inventory_unit 表的 DTO。V1 无 tenant_id。 */
data class V1InventoryUnit(
    val id: Long,
    val unitType: String,
    val depotId: Long?,
    val purchaseOrderId: Long,
    val initialQuantity: Long,
    val quantity: Long,
    val frozenQuantity: Long,
    val receivedAt: Instant?,
    val saleOrderIds: List<Long>?,
    val status: String,
    val unitPrice: java.math.BigDecimal?,
    val version: Long,
    val batchCode: java.util.UUID?,
    val serialNumber: String?,
    val inventoryId: Long?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 supplier 表的 DTO。V1 无 tenant_id。 */
data class V1Supplier(
    val id: Long,
    val name: String,
    val address: String?,
    val contactPerson: String?,
    val phone: String?,
    val enabled: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 purchase_order 表的 DTO。V1 无 tenant_id。 */
data class V1PurchaseOrder(
    val id: Long,
    val no: java.util.UUID,
    val note: String?,
    val orderDate: java.time.LocalDate?,
    val status: String?,
    val supplierId: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 purchase_order_item 表的 DTO。V1 无 tenant_id。 */
data class V1PurchaseOrderItem(
    val id: Long,
    val productId: Long,
    val productType: String?,
    val quantity: Int,
    val serialNumber: String?,
    val unitPrice: java.math.BigDecimal?,
    val orderId: Long?,
    val batchCode: java.util.UUID?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 customer 表的 DTO。V1 无 tenant_id。 */
data class V1Customer(
    val id: Long,
    val name: String,
    val address: String?,
    val phone: String?,
    val enabled: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 sale_order 表的 DTO。V1 无 tenant_id。 */
data class V1SaleOrder(
    val id: Long,
    val customerId: Long,
    val no: java.util.UUID,
    val note: String?,
    val orderDate: java.time.LocalDate?,
    val status: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 sale_order_item 表的 DTO。V1 无 tenant_id。 */
data class V1SaleOrderItem(
    val id: Long,
    val inventoryUnitId: Long,
    val inventoryUnitType: String?,
    val quantity: Int,
    val unitPrice: java.math.BigDecimal?,
    val orderId: Long?,
    val discountFactor: java.math.BigDecimal?,
    val createdAt: Instant,
    val updatedAt: Instant,
)
