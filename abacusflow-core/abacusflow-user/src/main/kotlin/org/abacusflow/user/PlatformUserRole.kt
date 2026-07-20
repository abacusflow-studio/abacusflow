package org.abacusflow.user

import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.CreationTimestamp
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

/** Direct global assignment of a platform role to a user account. */
@Entity
@Table(
    name = "platform_user_role",
    uniqueConstraints = [UniqueConstraint(columnNames = ["user_id", "platform_role_id"])],
)
class PlatformUserRole(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "platform_role_id", nullable = false)
    val role: PlatformRole,
) : AbstractAggregateRoot<PlatformUserRole>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @CreationTimestamp
    val createdAt: Instant = Instant.now()
}
