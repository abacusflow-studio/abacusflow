package org.abacusflow.db.user

import org.abacusflow.user.Permission
import org.springframework.data.jpa.repository.JpaRepository

interface PermissionRepository : JpaRepository<Permission, Long> {
    fun findAllByOrderByNameAsc(): List<Permission>
    fun findByName(name: String): Permission?
}
