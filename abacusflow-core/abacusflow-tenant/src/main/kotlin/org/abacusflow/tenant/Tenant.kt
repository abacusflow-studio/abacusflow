package org.abacusflow.tenant

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

/**
 * 租户聚合根。
 *
 * 代表 SaaS 系统中的一个租户（组织/企业），是数据隔离的基本单位。
 * 每个租户拥有独立的业务数据（产品、库存、订单等），通过 PostgreSQL RLS 实现行级隔离。
 *
 * 租户的生命周期：创建(ACTIVE) → 暂停(SUSPENDED) → 注销(DEPROVISIONED)
 */
@Entity
@Table(
    name = "tenant",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["name"]),
    ],
)
class Tenant(
    /** 租户唯一标识名，用于系统内部引用（不可重复，创建后不可修改） */
    @field:NotBlank
    @field:Size(min = 1, max = 100)
    @Column(name = "name", nullable = false, length = 100)
    val name: String,
) : AbstractAggregateRoot<Tenant>() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    /** 租户显示名称，用于前端展示（可修改） */
    @Column(name = "display_name", length = 200)
    var displayName: String? = null
        private set

    /** 租户当前状态，控制租户是否可正常使用系统 */
    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "status", nullable = false)
    var status: TenantStatus = TenantStatus.ACTIVE
        private set

    /** 创建时间，由 Hibernate 自动填充 */
    @CreationTimestamp
    val createdAt: Instant = Instant.now()

    /** 最后更新时间，由 Hibernate 自动填充 */
    @UpdateTimestamp
    var updatedAt: Instant = Instant.EPOCH
        private set

    /**
     * 更新租户资料信息。
     *
     * @param displayName 新的显示名称，null 表示不更新
     */
    fun updateProfile(displayName: String?) {
        displayName?.let { this.displayName = it }
        updatedAt = Instant.now()
    }

    /**
     * 暂停租户。
     *
     * 租户被暂停后，其成员将无法访问该租户的数据。
     * 适用于欠费、违规等场景。
     */
    fun suspend() {
        status = TenantStatus.SUSPENDED
        updatedAt = Instant.now()
    }

    /**
     * 重新激活租户。
     *
     * 将暂停状态的租户恢复为正常可用状态。
     */
    fun reactivate() {
        status = TenantStatus.ACTIVE
        updatedAt = Instant.now()
    }

    /**
     * 注销租户。
     *
     * 租户被永久停用，数据保留但不可恢复访问。
     * 此操作不可逆。
     */
    fun deprovision() {
        status = TenantStatus.DEPROVISIONED
        updatedAt = Instant.now()
    }
}
