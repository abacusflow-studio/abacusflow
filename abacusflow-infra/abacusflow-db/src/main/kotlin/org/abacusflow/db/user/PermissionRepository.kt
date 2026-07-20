package org.abacusflow.db.user

import org.abacusflow.user.Permission
import org.abacusflow.user.PermissionScope
import org.springframework.data.jpa.repository.JpaRepository

interface PermissionRepository : JpaRepository<Permission, Long> {
    fun findAllByOrderByNameAsc(): List<Permission>

    fun findAllByScopeInOrderByNameAsc(scopes: Collection<PermissionScope>): List<Permission>

    fun findByName(name: String): Permission?
}
