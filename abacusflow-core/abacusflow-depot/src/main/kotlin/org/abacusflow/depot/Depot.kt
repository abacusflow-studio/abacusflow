package org.abacusflow.depot

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.PositiveOrZero
import jakarta.validation.constraints.Size
import org.abacusflow.commons.tenant.TenantContextHolder
import org.abacusflow.commons.tenant.TenantScopedEntity
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.Filter
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

@Entity
@Table(
    name = "depot",
    uniqueConstraints = [UniqueConstraint(columnNames = ["tenant_id", "name"])],
)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class Depot(
    name: String,
    location: String?,
    capacity: Int?,
    @Column(name = "tenant_id", nullable = false)
    override val tenantId: Long = TenantContextHolder.currentTenantId(),
) : AbstractAggregateRoot<Depot>(), TenantScopedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @field:NotBlank
    @field:Size(max = 100)
    var name: String = name
        private set

    @field:Size(max = 200)
    var location: String? = location
        private set

    @field:PositiveOrZero
    var capacity: Int = capacity ?: 0
        private set

    var enabled: Boolean = true
        private set

    @CreationTimestamp
    val createdAt: Instant = Instant.now()

    @UpdateTimestamp
    var updatedAt: Instant = Instant.now()
        private set

    fun updateDepotInfo(
        newName: String?,
        newLocation: String? = null,
        newCapacity: Int? = null,
    ) {
        newName?.let {
            name = it
        }
        newLocation?.let {
            location = it
        }
        newCapacity?.let {
            capacity = it
        }
        updatedAt = Instant.now()
        registerEvent(DepotUpdatedEvent(id, tenantId))
    }

    fun enable() {
        if (enabled) return

        enabled = true
        updatedAt = Instant.now()
    }

    fun disable() {
        if (!enabled) return

        enabled = false
        updatedAt = Instant.now()
    }
}
