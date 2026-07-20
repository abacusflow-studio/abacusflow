package org.abacusflow.db.user

import org.abacusflow.tenant.TenantRole
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface TenantRoleRepository : JpaRepository<TenantRole, Long> {
    @EntityGraph(attributePaths = ["permissionsMutable"])
    fun findByName(name: String): TenantRole?

    fun existsByName(name: String): Boolean
}
