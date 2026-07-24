package org.abacusflow.migration.migration.v1

import java.time.Instant

/*
 * ## V1 数据传输对象（DTO）
 *
 * ### 什么是 DTO？
 * DTO（Data Transfer Object）是纯粹的数据容器，只有属性，没有业务逻辑。
 * 用于在「从 source 读取的一行数据」和「写入 target 的 SQL 参数」之间传递数据。
 *
 * ### 为什么每个迁移任务定义自己的 V1 DTO？
 * 不使用 Map<String, Any?> 的原因：
 * 1. 类型安全：编译期就能发现字段名拼写错误
 * 2. 可读性：明确知道 V1 表有哪些列、哪些可空
 * 3. IDE 支持：自动补全、重构、跳转
 *
 * ### 数据流
 * ```
 * V1 source table → V1 DTO → Mapper → V2 INSERT SQL
 *     (jOOQ 读)     (类型安全)  (转换逻辑)  (jOOQ 写)
 * ```
 *
 * ### V1 与 V2 的关键区别
 * - V1 **没有** tenant_id 列（V1 是单租户）
 * - V1 role 是全局的（V2 是 tenant_role，租户级）
 * - V1 permission 没有 scope 列（V2 区分 PLATFORM/TENANT/BUSINESS）
 * - V1 user_role 直接关联（V2 改为 membership + membership_role）
 *
 * ### 语法说明
 * - `data class`：Kotlin 自动生成 equals/hashCode/toString/copy
 * - `val`：只读属性（不可变），对应数据库列
 * - `String?`：可空类型（? 后缀表示可以为 null），对应数据库 NULLABLE 列
 * - `Long`：64位整数，对应数据库 BIGINT
 * - `Instant`：时间戳，对应数据库 TIMESTAMPTZ
 * - `BigDecimal`：精确小数，对应数据库 NUMERIC(38,2)（金额！禁止用 Double）
 * - `UUID`：对应数据库 UUID 类型
 * - `List<Long>?`：对应数据库 BIGINT[]（PostgreSQL 数组类型）
 * - `= false`：默认参数值，当构造时不传该参数则使用默认值
 */

/**
 * V1 user_account 表的 DTO。
 *
 * V1 字段对照 V2：
 * | V1 字段    | V2 字段    | 变化 |
 * |-----------|-----------|------|
 * | id        | id        | 保留，但通过 v1_user_id_map 映射 |
 * | name      | name      | 保留，UNIQUE 约束可能冲突（V2 seed admin） |
 * | password  | password  | 保留（已是 hash） |
 * | sex       | sex       | 枚举值相同 |
 * | —         | tenant_id | V2 没有！user_account 是全局表 |
 */
data class V1UserAccount(
    val id: Long, // BIGINT PRIMARY KEY
    val age: Int, // INTEGER NOT NULL
    val enabled: Boolean, // BOOLEAN NOT NULL
    val locked: Boolean, // BOOLEAN NOT NULL
    val name: String, // VARCHAR(50) NOT NULL UNIQUE
    val nick: String?, // VARCHAR(255) NULLABLE
    val password: String, // VARCHAR(255) NOT NULL（BCrypt hash）
    val sex: String?, // ENUM('M','F') NULLABLE
    val createdAt: Instant, // TIMESTAMPTZ NOT NULL
    val updatedAt: Instant, // TIMESTAMPTZ NOT NULL
)

/** V1 user_external_identity 表的 DTO（OIDC/SSO 外部身份）。 */
data class V1ExternalIdentity(
    val id: Long,
    val issuer: String, // OIDC issuer URL
    val subject: String, // OIDC subject（唯一标识）
    val userId: Long, // FK → user_account.id
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

// ──────────────────────────────────────────────────────────────
//  角色与权限（V1 全局，V2 租户级）
// ──────────────────────────────────────────────────────────────

/**
 * V1 role 表的 DTO。V1 角色是**全局**的，没有 tenant_id。
 *
 * V1→V2 映射：
 * - V1 `role` → V2 `tenant_role`（加 tenant_id=1）
 * - V1 role.id **不直接保留**，通过 v1_role_id_map 转换
 * - 同名角色（admin/reader/operator）复用 V2 seed 行
 */
data class V1Role(
    val id: Long,
    val name: String, // V1 全局唯一；V2 改为 (tenant_id, name) 唯一
    val label: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/**
 * V1 permission 表的 DTO。V1 **没有 scope 列**。
 *
 * V1→V2 映射：
 * - V1 permission.name（如 "product:read"）→ V2 permission.name（如 "business:product:read"）
 * - scope 由 PermissionMapping.inferScope() 推断
 * - 映射结果存入 v1_permission_id_map
 */
data class V1Permission(
    val id: Long,
    val name: String, // V1: "product:read"；V2: "business:product:read"
    val label: String,
    val description: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 role_permission 关联表（V1: role_id → permission_id）。 */
data class V1RolePermission(
    val roleId: Long,
    val permissionId: Long,
)

/** V1 user_role 关联表（V1: user_id → role_id，直接关联）。V2 改为 membership + membership_role。 */
data class V1UserRole(
    val userId: Long,
    val roleId: Long,
)

// ──────────────────────────────────────────────────────────────
//  产品
// ──────────────────────────────────────────────────────────────

/** V1 product_category 表的 DTO。parentId=? 表示根分类（无父节点）。 */
data class V1ProductCategory(
    val id: Long,
    val name: String,
    val description: String?,
    val parentId: Long?, // 自引用 FK：NULL = 根分类
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 product 表的 DTO。barcode 在 V1 全局唯一，V2 改为 (tenant_id, barcode) 唯一。 */
data class V1Product(
    val id: Long,
    val name: String,
    val specification: String?,
    val barcode: String, // V1 全局唯一 → V2 租户内唯一
    val type: String?, // product_type ENUM
    val unit: String, // product_unit ENUM
    val note: String?,
    val enabled: Boolean,
    val categoryId: Long, // FK → product_category.id
    val createdAt: Instant,
    val updatedAt: Instant,
)

// ──────────────────────────────────────────────────────────────
//  仓库与库存
// ──────────────────────────────────────────────────────────────

/** V1 depot（仓库）表的 DTO。 */
data class V1Depot(
    val id: Long,
    val name: String,
    val location: String?,
    val capacity: Int,
    val enabled: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 inventory 表的 DTO。productId 在 V1 唯一（每产品一条库存记录）。 */
data class V1Inventory(
    val id: Long,
    val maxStock: Long,
    val productId: Long, // V1 唯一 → V2 (tenant_id, product_id) 唯一
    val safetyStock: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/**
 * V1 inventory_unit 表的 DTO。
 *
 * ⚠️ 重要：
 * - unitPrice 必须用 BigDecimal，禁止 Double（避免浮点精度丢失）
 * - saleOrderIds 是 PostgreSQL BIGINT[] 数组类型，映射为 List<Long>
 * - serialNumber 在 V1 全局唯一，V2 改为 (tenant_id, serial_number) 唯一
 */
data class V1InventoryUnit(
    val id: Long,
    val unitType: String, // inventory_unit_type ENUM: INSTANCE/BATCH
    val depotId: Long?, // FK → depot.id（可空）
    val purchaseOrderId: Long, // FK → purchase_order.id
    val initialQuantity: Long,
    val quantity: Long,
    val frozenQuantity: Long,
    val receivedAt: Instant?,
    val saleOrderIds: List<Long>?, // PostgreSQL BIGINT[] 数组
    val status: String, // inventory_status ENUM
    val unitPrice: java.math.BigDecimal?, // ⚠️ 禁止用 Double！
    val version: Long, // 乐观锁版本号
    val batchCode: java.util.UUID?, // 批次码（BATCH 类型时使用）
    val serialNumber: String?, // 序列号（INSTANCE 类型时使用）
    val inventoryId: Long?, // FK → inventory.id
    val createdAt: Instant,
    val updatedAt: Instant,
)

// ──────────────────────────────────────────────────────────────
//  合作伙伴（供应商 / 客户）
// ──────────────────────────────────────────────────────────────

/** V1 supplier（供应商）表的 DTO。 */
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

/** V1 customer（客户）表的 DTO。 */
data class V1Customer(
    val id: Long,
    val name: String,
    val address: String?,
    val phone: String?,
    val enabled: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

// ──────────────────────────────────────────────────────────────
//  采购
// ──────────────────────────────────────────────────────────────

/** V1 purchase_order 表的 DTO。no 是 UUID 类型。 */
data class V1PurchaseOrder(
    val id: Long,
    val no: java.util.UUID, // 采购单号（UUID）
    val note: String?,
    val orderDate: java.time.LocalDate?,
    val status: String?, // order_status ENUM
    val supplierId: Long, // FK → supplier.id
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 purchase_order_item（采购明细）表的 DTO。 */
data class V1PurchaseOrderItem(
    val id: Long,
    val productId: Long, // FK → product.id
    val productType: String?, // product_type ENUM
    val quantity: Int,
    val serialNumber: String?,
    val unitPrice: java.math.BigDecimal?,
    val orderId: Long?, // FK → purchase_order.id
    val batchCode: java.util.UUID?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

// ──────────────────────────────────────────────────────────────
//  销售
// ──────────────────────────────────────────────────────────────

/** V1 sale_order 表的 DTO。 */
data class V1SaleOrder(
    val id: Long,
    val customerId: Long, // FK → customer.id
    val no: java.util.UUID, // 销售单号（UUID）
    val note: String?,
    val orderDate: java.time.LocalDate?,
    val status: String?, // order_status ENUM
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** V1 sale_order_item（销售明细）表的 DTO。 */
data class V1SaleOrderItem(
    val id: Long,
    val inventoryUnitId: Long, // FK → inventory_unit.id
    val inventoryUnitType: String?, // inventory_unit_type ENUM
    val quantity: Int,
    val unitPrice: java.math.BigDecimal?,
    val orderId: Long?, // FK → sale_order.id
    val discountFactor: java.math.BigDecimal?, // 折扣因子
    val createdAt: Instant,
    val updatedAt: Instant,
)
