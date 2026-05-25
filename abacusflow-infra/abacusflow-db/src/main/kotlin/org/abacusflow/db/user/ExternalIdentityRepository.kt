package org.abacusflow.db.user

import org.abacusflow.user.ExternalIdentity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ExternalIdentityRepository : JpaRepository<ExternalIdentity, Long> {
    fun findByIssuerAndSubject(issuer: String, subject: String): ExternalIdentity?

    fun findByUserId(userId: Long): List<ExternalIdentity>

    fun findByEmail(email: String): ExternalIdentity?
}
