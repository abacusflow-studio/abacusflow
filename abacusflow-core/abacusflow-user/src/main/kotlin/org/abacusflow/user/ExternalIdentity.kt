package org.abacusflow.user

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import jakarta.validation.constraints.NotBlank
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import org.springframework.data.domain.AbstractAggregateRoot
import java.time.Instant

@Entity
@Table(
    name = "user_external_identity",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["issuer", "subject"]),
    ],
)
class ExternalIdentity(
    @field:NotBlank
    @Column(nullable = false, length = 500)
    val issuer: String,
    @field:NotBlank
    @Column(nullable = false)
    val subject: String,
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,
    @Column(length = 32)
    var provider: String? = null,
    @Column(length = 320)
    var email: String? = null,
    @Column(name = "email_verified")
    var emailVerified: Boolean = false,
    @Column(name = "display_name")
    var displayName: String? = null,
    @Column(name = "picture_url", length = 1024)
    var pictureUrl: String? = null,
) : AbstractAggregateRoot<ExternalIdentity>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    @Column(name = "last_login_at")
    var lastLoginAt: Instant? = null
        private set

    @Column(name = "profile_synced_at")
    var profileSyncedAt: Instant? = null
        private set

    @CreationTimestamp
    val createdAt: Instant = Instant.now()

    @UpdateTimestamp
    var updatedAt: Instant = Instant.EPOCH
        private set

    fun syncProfile(
        newEmail: String?,
        newEmailVerified: Boolean?,
        newDisplayName: String?,
        newPictureUrl: String?,
    ) {
        newEmail?.let { email = it }
        newEmailVerified?.let { emailVerified = it }
        newDisplayName?.let { displayName = it }
        newPictureUrl?.let { pictureUrl = it }
        profileSyncedAt = Instant.now()
        updatedAt = Instant.now()
    }

    fun recordLogin() {
        lastLoginAt = Instant.now()
        updatedAt = Instant.now()
    }
}
