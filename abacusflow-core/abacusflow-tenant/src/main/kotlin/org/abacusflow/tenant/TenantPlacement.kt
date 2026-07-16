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
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcType
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.dialect.PostgreSQLEnumJdbcType
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

/**
 * 租户位置信息聚合根。
 *
 * 记录租户在 SaaS 基础设施中的物理位置，用于未来 Cell 路由和数据库迁移。
 * 当前阶段（P0）所有租户位于默认 Cell，使用共享数据库 + RLS 隔离。
 *
 * 未来演进：
 * - 当租户需要迁移到独立数据库时，更新 [storageMode] 为 [TenantStorageMode.DEDICATED_DATABASE]
 * - 迁移过程中通过 [placementVersion] 实现路由切换的版本控制
 * - Cell 路由中间件根据 [cellId] 将请求路由到正确的数据库实例
 */
@Entity
@Table(
    name = "tenant_placement",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["tenant_id"]),
    ],
)
class TenantPlacement(
    /** 所属租户 ID（每个租户只有一条位置记录） */
    @Column(name = "tenant_id", nullable = false)
    val tenantId: Long,

    /**
     * Cell 标识——租户数据所在的逻辑分区。
     *
     * Cell 是数据库实例的逻辑分组，同一 Cell 内的租户共享数据库实例。
     * 默认值 "cell-default-01" 表示主共享 Cell。
     */
    @Column(name = "cell_id", nullable = false, length = 100)
    var cellId: String = "cell-default-01",

    /**
     * 存储模式——租户数据的物理存储方式。
     *
     * - [TenantStorageMode.SHARED_CELL]: 共享数据库，通过 RLS 隔离（当前默认）
     * - [TenantStorageMode.DEDICATED_DATABASE]: 独立数据库实例，数据物理隔离
     */
    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType::class)
    @Column(name = "storage_mode", nullable = false)
    var storageMode: TenantStorageMode = TenantStorageMode.SHARED_CELL,
) : AbstractAggregateRoot<TenantPlacement>() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    /**
     * 位置版本号——用于租户迁移时的路由切换控制。
     *
     * 每次租户位置变更（如 Cell 迁移、存储模式切换）时递增。
     * 路由中间件通过版本号确保迁移过程中的请求路由一致性。
     */
    @Column(name = "placement_version", nullable = false)
    var placementVersion: Long = 1
        private set

    /** 创建时间，由 Hibernate 自动填充 */
    @CreationTimestamp
    val createdAt: Instant = Instant.now()

    /** 最后更新时间，由 Hibernate 自动填充 */
    @UpdateTimestamp
    var updatedAt: Instant = Instant.EPOCH
        private set

    /**
     * 递增位置版本号。
     *
     * 在租户位置变更（Cell 迁移、存储模式切换）时调用，
     * 路由中间件将根据新版本号更新路由规则。
     */
    fun incrementVersion() {
        placementVersion++
        updatedAt = Instant.now()
    }
}
