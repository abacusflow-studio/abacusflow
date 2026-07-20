package org.abacusflow.tenant

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

/**
 * 租户成员资格聚合根。
 *
 * 表示用户与租户之间的关联关系，即"某个用户属于某个租户"。
 * 一个用户可以属于多个租户（多租户成员），每个成员关系有独立的状态和角色。
 *
 * 成员资格仅通过 [TenantInvitation] 邀请流程创建。
 * 每个成员关系可关联多个 [TenantRole]，决定该用户在此租户下的权限。
 */
@Entity
@Table(
    name = "tenant_membership",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["tenant_id", "user_id"]),
    ],
)
class TenantMembership(
    /** 所属租户 ID */
    @Column(name = "tenant_id", nullable = false)
    val tenantId: Long,

    /** 所属用户 ID */
    @Column(name = "user_id", nullable = false)
    val userId: Long,
) : AbstractAggregateRoot<TenantMembership>() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    /** 成员资格状态，控制用户是否可访问该租户的数据 */
    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "status", nullable = false)
    var status: MembershipStatus = MembershipStatus.ACTIVE
        private set

    /**
     * 该成员在当前租户下拥有的角色集合。
     *
     * 角色决定了用户在此租户下可执行的操作（如 business:product:read、business:sale-order:create 等）。
     * 通过 tenant_membership_role 关联表实现多对多关系。
     */
    @ManyToMany
    @JoinTable(
        name = "tenant_membership_role",
        joinColumns = [JoinColumn(name = "membership_id")],
        inverseJoinColumns = [JoinColumn(name = "role_id")],
    )
    private val rolesMutable: MutableSet<TenantRole> = mutableSetOf()

    /** 角色集合的只读视图 */
    val tenantRoles: Set<TenantRole>
        get() = rolesMutable.toSet()

    /** 创建时间，由 Hibernate 自动填充 */
    @CreationTimestamp
    val createdAt: Instant = Instant.now()

    /** 最后更新时间，由 Hibernate 自动填充 */
    @UpdateTimestamp
    var updatedAt: Instant = Instant.EPOCH
        private set

    /**
     * 为该成员添加角色。
     *
     * @param tenantRole 要添加的角色
     * @throws IllegalArgumentException if the role belongs to a different tenant
     */
    fun addRole(tenantRole: TenantRole) {
        require(tenantRole.tenantId == tenantId) {
            "Role '${tenantRole.name}' belongs to tenant ${tenantRole.tenantId}, " +
                "but this membership is for tenant $tenantId"
        }
        rolesMutable.add(tenantRole)
        updatedAt = Instant.now()
    }

    /**
     * 移除该成员的角色。
     *
     * @param tenantRole 要移除的角色
     */
    fun removeRole(tenantRole: TenantRole) {
        rolesMutable.remove(tenantRole)
        updatedAt = Instant.now()
    }

    /**
     * 暂停该成员资格。
     *
     * 用户在该租户的访问权限被临时冻结，不影响其他租户的成员关系。
     */
    fun suspend() {
        status = MembershipStatus.SUSPENDED
        updatedAt = Instant.now()
    }

    /**
     * 重新激活该成员资格。
     *
     * 将暂停状态的成员恢复为正常可用状态。
     */
    fun reactivate() {
        status = MembershipStatus.ACTIVE
        updatedAt = Instant.now()
    }
}
