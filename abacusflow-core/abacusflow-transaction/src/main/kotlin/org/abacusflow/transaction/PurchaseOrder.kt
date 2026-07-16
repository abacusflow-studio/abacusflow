package org.abacusflow.transaction

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToMany
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import jakarta.validation.constraints.NotNull
import org.abacusflow.commons.tenant.TenantContextHolder
import org.abacusflow.commons.tenant.TenantScopedEntity
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.Filter
import org.hibernate.annotations.FilterDef
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.ParamDef
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.springframework.data.domain.AbstractAggregateRoot
import java.math.BigDecimal
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.collections.filter

@Entity
@Table(
    name = "purchase_order",
    uniqueConstraints = [UniqueConstraint(columnNames = ["tenant_id", "no"])],
)
@FilterDef(name = "tenantFilter", parameters = [ParamDef(name = "tenantId", type = Long::class)])
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class PurchaseOrder(
    val supplierId: Long,
    val orderDate: LocalDate = LocalDate.now(),
    val note: String?,
    @OneToMany(cascade = [CascadeType.ALL], orphanRemoval = true)
    @JoinColumn(name = "order_id")
    val items: List<PurchaseOrderItem>,
    @Column(name = "tenant_id", nullable = false)
    override val tenantId: Long = TenantContextHolder.currentTenantId(),
) : AbstractAggregateRoot<PurchaseOrder>(), TenantScopedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @field:NotNull
    val no: UUID = UUID.randomUUID()

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    var status: OrderStatus = OrderStatus.PENDING
        private set

    @CreationTimestamp
    val createdAt: Instant = Instant.now()

    @UpdateTimestamp
    var updatedAt: Instant = Instant.now()
        private set

    init {
        validateAssetItems(items)
        validateMaterialItems(items)
    }

    fun completeOrder() {
        require(status == OrderStatus.PENDING) { "只有待处理订单才能完成" }
        status = OrderStatus.COMPLETED
        updatedAt = Instant.now()

        registerEvent(PurchaseOrderCompletedEvent(this))
    }

    fun cancelOrder() {
        require(status == OrderStatus.PENDING) { "只有待处理订单才能取消" }
        require(createdAt.plus(Duration.ofDays(7)).isAfter(Instant.now())) {
            "订单创建超过 7 天，无法进行任何操作"
        }

        status = OrderStatus.CANCELED
        updatedAt = Instant.now()

        registerEvent(PurchaseOrderCanceledEvent(this))
    }

    fun reverseOrder() {
        require(status == OrderStatus.COMPLETED) { "只有已完成订单才能撤回" }
        require(createdAt.plus(Duration.ofDays(7)).isAfter(Instant.now())) {
            "订单创建超过 7 天，无法进行任何操作"
        }

        status = OrderStatus.REVERSED
        updatedAt = Instant.now()

        registerEvent(PurchaseOrderReversedEvent(this))
    }

    val totalAmount: BigDecimal
        get() = items.sumOf { it.subtotal }
    val totalQuantity: Long
        get() = items.sumOf { it.quantity.toLong() }
    val itemCount: Int
        get() = items.distinctBy { it.productId }.size

    private fun validateAssetItems(items: List<PurchaseOrderItem>) {
        val duplicateSerials =
            items
                .filter { it.productType == TransactionProductType.ASSET }
                .mapNotNull { it.serialNumber }
                .groupingBy { it }
                .eachCount()
                .filterValues { it > 1 }

        require(duplicateSerials.isEmpty()) {
            "资产类商品中存在重复的序列号: ${duplicateSerials.keys}"
        }
    }

    private fun validateMaterialItems(items: List<PurchaseOrderItem>) {
        val materialItems = items.filter { it.productType == TransactionProductType.MATERIAL }

        val duplicateUnitPrices =
            materialItems
                .groupingBy { it.productId to it.unitPrice }
                .eachCount()
                .filterValues { it > 1 }

        val duplicateBatchCodes =
            materialItems
                .filter { it.batchCode != null }
                .groupingBy { it.productId to it.batchCode }
                .eachCount()
                .filterValues { it > 1 }

        require(duplicateUnitPrices.isEmpty() && duplicateBatchCodes.isEmpty()) {
            buildString {
                if (duplicateUnitPrices.isNotEmpty()) {
                    append("普通类商品中存在重复单价（相同 productId + unitPrice）: ${duplicateUnitPrices.keys}。")
                }
                if (duplicateBatchCodes.isNotEmpty()) {
                    append("普通类商品中存在重复批次号（相同 productId + batchCode）: ${duplicateBatchCodes.keys}。")
                }
            }
        }
    }

    @PrePersist
    fun prePersist() {
        registerEvent(PurchaseOrderCreatedEvent(this))
    }
}
