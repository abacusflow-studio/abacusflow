package org.abacusflow.inventory

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import jakarta.validation.constraints.PositiveOrZero
import org.abacusflow.commons.tenant.TenantContextHolder
import org.abacusflow.commons.tenant.TenantScopedEntity
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.Filter
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

@Entity
@Table(
    name = "inventory",
    uniqueConstraints = [UniqueConstraint(columnNames = ["tenant_id", "product_id"])],
)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class Inventory(
    @Column(name = "product_id", nullable = false)
    val productId: Long, // 通过ID关联产品
    @Column(name = "tenant_id", nullable = false)
    override val tenantId: Long = TenantContextHolder.currentTenantId(),
) : AbstractAggregateRoot<Inventory>(), TenantScopedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @field:PositiveOrZero
    var safetyStock: Long = 1
        // 安全库存量
        private set

    @field:PositiveOrZero
    var maxStock: Long = 10 // 安全库存量
        private set

    @CreationTimestamp
    val createdAt: Instant = Instant.now()

    @UpdateTimestamp
    var updatedAt: Instant = Instant.now()
        private set

    fun adjustWarningLine(
        newSafetyStock: Long,
        newMaxStock: Long,
    ) {
        require(newSafetyStock >= 0) { "安全库存不能为负数" }
        require(newMaxStock >= newSafetyStock) { "最大库存必须大于或等于安全库存" }

        this.safetyStock = newSafetyStock
        this.maxStock = newMaxStock
        this.updatedAt = Instant.now()
    }
}
