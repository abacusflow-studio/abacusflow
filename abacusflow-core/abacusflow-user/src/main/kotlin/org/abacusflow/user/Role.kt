package org.abacusflow.user

import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

@Entity
@Table(
    name = "role",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["name"]),
    ],
)
class Role(
    @field:NotBlank(message = "Role name is required and cannot be blank")
    @field:Pattern(
        regexp = "^[a-zA-Z0-9_:]*\$",
        message = "Role names should contain only letters, numbers, underscores and colons.",
    )
    @field:Size(min = 1, max = 50, message = "Name must be between 1 and 50 characters")
    val name: String,
) : AbstractAggregateRoot<Role>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    var label: String = name
        private set

    @ManyToMany
    @JoinTable(
        name = "role_permission",
        joinColumns = [JoinColumn(name = "role_id")],
        inverseJoinColumns = [JoinColumn(name = "permission_id")],
    )
    val permissions = mutableSetOf<Permission>()

    @CreationTimestamp
    @NotNull
    val createdAt: Instant = Instant.now()

    @UpdateTimestamp
    @NotNull
    var updatedAt: Instant = Instant.EPOCH
        private set

    fun updateProfile(label: String) {
        this.label = label
    }

    fun addPermission(permission: Permission) {
        permissions.add(permission)
    }

    fun removePermission(permission: Permission) {
        permissions.remove(permission)
    }
}
