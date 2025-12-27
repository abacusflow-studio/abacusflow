package org.abacusflow.usecase.inventory

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class BasicInventoryUnitTO(
    val id: Long,
    val title: String,
    val type: String, // "INSTANCE" 或 "BATCH"
    val status: String,
    val purchaseOrderNo: UUID,
    val saleOrderNos: List<UUID>,
    val depotName: String?,
    val initialQuantity: Long,
    val quantity: Long,
    val remainingQuantity: Long,
    val unitPrice: BigDecimal,
    val receivedAt: Instant,
    val batchCode: UUID?, // 如果是批次单元
    val serialNumber: String?, // 如果是资产单元
)

data class InventoryUnitTO(
    val id: Long,
    val type: String, // INSTANCE 或 BATCH
    val inventoryId: Long,
    val purchaseOrderId: Long,
    val initialQuantity: Long,
    val quantity: Long,
    val remainingQuantity: Long,
    val unitPrice: BigDecimal,
    val depotId: Long?,
    val status: String, // NORMAL / CONSUMED / CANCELED / REVERSED
    val saleOrderIds: List<Long>,
    val receivedAt: Instant,
    val createdAt: Instant,
    val updatedAt: Instant,
    // 特有字段，视类型动态赋值
    val serialNumber: String?,
    val batchCode: UUID?,
)

data class InventoryUnitWithTitleTO(
    val id: Long,
    val type: String, // INSTANCE 或 BATCH
    val title: String,
    val status: String, // NORMAL / CONSUMED / CANCELED / REVERSED
)

data class InventoryUnitForExportTO(
    val title: String,
    val type: String, // "INSTANCE" 或 "BATCH"
    val status: String,
    val purchaseOrderNo: UUID,
    val saleOrderNos: List<UUID>,
    val depotName: String?,
    val supplierName: String,
    val initialQuantity: Long,
    val quantity: Long,
    val remainingQuantity: Long,
    val unitPrice: BigDecimal,
    val receivedAt: Instant,
    val batchCode: UUID?, // 如果是批次单元
    val serialNumber: String?, // 如果是资产单元
)
