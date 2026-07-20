package org.abacusflow.db.user

import org.abacusflow.user.PlatformRole
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository

interface PlatformRoleRepository : JpaRepository<PlatformRole, Long> {
    @EntityGraph(attributePaths = ["permissionsMutable"])
    fun findByName(name: String): PlatformRole?

    fun existsByName(name: String): Boolean
}
