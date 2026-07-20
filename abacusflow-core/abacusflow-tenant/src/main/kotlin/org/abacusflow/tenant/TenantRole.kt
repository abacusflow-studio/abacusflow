package org.abacusflow.tenant

import jakarta.persistence.Column
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
import org.abacusflow.commons.tenant.TenantScopedEntity
import org.abacusflow.user.Permission
import org.abacusflow.user.PermissionScope
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.Filter
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

@Entity
@Table(
    name = "tenant_role",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["tenant_id", "name"]),
    ],
)
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
class TenantRole(
    @field:NotBlank(message = "Role name is required and cannot be blank")
    @field:Pattern(
        regexp = "^[a-zA-Z0-9_:]*\$",
        message = "Role names should contain only letters, numbers, underscores and colons.",
    )
    @field:Size(min = 1, max = 50, message = "Name must be between 1 and 50 characters")
    val name: String,
    @Column(name = "tenant_id", nullable = false)
    override val tenantId: Long,
) : AbstractAggregateRoot<TenantRole>(), TenantScopedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    var label: String = name
        private set

    @ManyToMany
    @JoinTable(
        name = "tenant_role_permission",
        joinColumns = [JoinColumn(name = "role_id")],
        inverseJoinColumns = [JoinColumn(name = "permission_id")],
    )
    private val permissionsMutable: MutableSet<Permission> = mutableSetOf()

    /** Read-only view of the role's permissions. */
    val permissions: Set<Permission>
        get() = permissionsMutable.toSet()

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

    /**
     * Atomically replace all permissions on this role.
     * Validates that no PLATFORM permissions are included and that all permissions exist.
     */
    fun replacePermissions(permissions: Collection<Permission>) {
        require(permissions.all { it.scope != PermissionScope.PLATFORM }) {
            "Platform permissions cannot be assigned to tenant role '$name': " +
                permissions.filter { it.scope == PermissionScope.PLATFORM }.map { it.name }
        }
        permissionsMutable.clear()
        permissionsMutable.addAll(permissions)
    }

    /**
     * Add a single permission. Rejects PLATFORM permissions.
     */
    fun addPermission(permission: Permission) {
        require(permission.scope != PermissionScope.PLATFORM) {
            "Platform permission '${permission.name}' cannot be assigned to tenant role '$name'"
        }
        permissionsMutable.add(permission)
    }

    /**
     * Remove a single permission.
     */
    fun removePermission(permission: Permission) {
        permissionsMutable.remove(permission)
    }
}