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
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

/** Global platform role. It is deliberately not tenant scoped. */
@Entity
@Table(
    name = "platform_role",
    uniqueConstraints = [UniqueConstraint(columnNames = ["name"])],
)
class PlatformRole(
    @field:NotBlank
    @field:Pattern(regexp = "^[a-zA-Z0-9_:]*$")
    @field:Size(min = 1, max = 50)
    val name: String,
) : AbstractAggregateRoot<PlatformRole>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    var label: String = name
        private set

    @ManyToMany
    @JoinTable(
        name = "platform_role_permission",
        joinColumns = [JoinColumn(name = "platform_role_id")],
        inverseJoinColumns = [JoinColumn(name = "permission_id")],
    )
    private val permissionsMutable: MutableSet<Permission> = mutableSetOf()

    val permissions: Set<Permission>
        get() = permissionsMutable.toSet()

    @CreationTimestamp
    val createdAt: Instant = Instant.now()

    @UpdateTimestamp
    var updatedAt: Instant = Instant.EPOCH
        private set

    fun updateProfile(label: String) {
        this.label = label
    }

    fun replacePermissions(permissions: Collection<Permission>) {
        require(permissions.all { it.scope == PermissionScope.PLATFORM }) {
            "Platform roles may contain only PLATFORM permissions"
        }
        permissionsMutable.clear()
        permissionsMutable.addAll(permissions)
    }
}
