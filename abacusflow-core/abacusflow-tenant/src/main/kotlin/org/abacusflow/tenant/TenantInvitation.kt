package org.abacusflow.tenant

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

/**
 * 租户邀请聚合根。
 *
 * 表示向外部用户发出的加入租户的邀请。
 * 邀请与被邀请人的已验证邮箱绑定。用户登录后可直接接受或拒绝；一次性 token 仅用于兼容邀请链接。
 *
 * 邀请流程：
 * 1. 租户管理员创建邀请（指定邮箱和角色）
 * 2. 系统生成唯一 token 作为备用邀请链接凭证
 * 3. 被邀请人登录后通过已验证邮箱发现邀请并选择接受或拒绝
 * 4. 系统自动创建 [TenantMembership] 并关联指定角色
 */
@Entity
@Table(
    name = "tenant_invitation",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["token"]),
    ],
)
class TenantInvitation(
    /** 目标租户 ID——被邀请人将加入的租户 */
    @Column(name = "tenant_id", nullable = false)
    val tenantId: Long,

    /** 被邀请人的邮箱地址，用于发送邀请邮件和匹配已有账户 */
    @field:NotBlank
    @field:Size(max = 320)
    @Column(name = "email", nullable = false, length = 320)
    val email: String,

    /** 邀请时指定的角色 ID 集合，接受邀请后将自动分配这些角色 */
    @Column(name = "role_ids", nullable = false)
    val roleIds: MutableSet<Long> = mutableSetOf(),

    /** 发起邀请的用户 ID，用于审计追踪 */
    @Column(name = "invited_by_user_id")
    val invitedByUserId: Long? = null,

    /** 邀请唯一 token，用于验证邀请链接的合法性（一次性使用） */
    @field:NotBlank
    @Column(name = "token", nullable = false)
    val token: String,

    /** 邀请过期时间，超过此时间后邀请失效 */
    @Column(name = "expires_at", nullable = false)
    val expiresAt: Instant,

    /** 是否为平台供应租户时发出的首位管理员邀请。 */
    @Column(name = "initial_administrator", nullable = false)
    val initialAdministrator: Boolean = false,
) : AbstractAggregateRoot<TenantInvitation>() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    /** 邀请状态：PENDING（待接受）、ACCEPTED（已接受）、DECLINED（被邀请人拒绝）、CANCELLED（邀请人撤销） */
    @Column(name = "status", nullable = false, length = 20)
    var status: String = "PENDING"
        private set

    /** 接受邀请的时间，null 表示尚未接受 */
    @Column(name = "accepted_at")
    var acceptedAt: Instant? = null
        private set

    /** 创建时间，由 Hibernate 自动填充 */
    @CreationTimestamp
    val createdAt: Instant = Instant.now()

    /** 最后更新时间，由 Hibernate 自动填充 */
    @UpdateTimestamp
    var updatedAt: Instant = Instant.EPOCH
        private set

    /**
     * 接受邀请。
     *
     * 将邀请状态标记为已接受，并记录接受时间。
     * 调用方需负责创建对应的 [TenantMembership]。
     */
    fun accept() {
        require(status == "PENDING") { "Only pending invitations can be accepted" }
        status = "ACCEPTED"
        acceptedAt = Instant.now()
        updatedAt = Instant.now()
    }

    /**
     * 检查邀请是否已过期。
     *
     * @return true 表示当前时间已超过过期时间，邀请失效
     */
    fun isExpired(): Boolean = Instant.now().isAfter(expiresAt)

    fun cancel() {
        require(status == "PENDING") { "Only pending invitations can be cancelled" }
        status = "CANCELLED"
        updatedAt = Instant.now()
    }

    fun decline() {
        require(status == "PENDING") { "Only pending invitations can be declined" }
        status = "DECLINED"
        updatedAt = Instant.now()
    }
}
