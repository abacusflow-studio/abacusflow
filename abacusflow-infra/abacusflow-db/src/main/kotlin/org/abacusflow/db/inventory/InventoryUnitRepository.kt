package org.abacusflow.db.inventory

import jakarta.persistence.LockModeType
import org.abacusflow.inventory.InventoryUnit
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

/**
 * 库存单元 Repository。
 *
 * 租户隔离由 Hibernate Filter（tenantFilter）自动处理。
 * 注意：native query 不受 Hibernate Filter 影响，需手动追加 tenant_id 条件。
 */
@Repository
interface InventoryUnitRepository : JpaRepository<InventoryUnit, Long> {
    /** 按库存 ID 查询库存单元列表（Filter 自动追加 tenant_id 条件） */
    fun findByInventoryId(inventoryId: Long): List<InventoryUnit>

    /** 按库存对应的产品 ID 查询库存单元列表（Filter 自动追加 tenant_id 条件） */
    fun findByInventoryProductId(productId: Long): List<InventoryUnit>

    /** 按 ID 和状态列表查询库存单元（Filter 自动追加 tenant_id 条件） */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    fun findByIdAndStatusIn(
        id: Long,
        statuses: List<InventoryUnit.InventoryUnitStatus>,
    ): List<InventoryUnit>

    /** 按仓库 ID 查询库存单元列表（Filter 自动追加 tenant_id 条件） */
    fun findByDepotId(depotId: Long): List<InventoryUnit>

    /** 按采购单 ID 查询库存单元列表（Filter 自动追加 tenant_id 条件） */
    fun findByPurchaseOrderId(orderId: Long): List<InventoryUnit>

    /**
     * 根据销售单 ID 查询关联的库存单元。
     *
     * 使用 native query，Hibernate Filter 不生效，需手动追加 tenant_id 条件。
     */
    @Query(
        value = """
        SELECT * FROM inventory_unit
        WHERE :saleOrderId = ANY(sale_order_ids)
        AND tenant_id = :tenantId
    """,
        nativeQuery = true,
    )
    fun findAllBySaleOrderIdAndTenantId(
        @Param("saleOrderId") saleOrderId: Long,
        @Param("tenantId") tenantId: Long,
    ): List<InventoryUnit>
}
