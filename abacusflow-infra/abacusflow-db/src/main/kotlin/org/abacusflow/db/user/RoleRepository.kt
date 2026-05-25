package org.abacusflow.db.user

import org.abacusflow.user.Role
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface RoleRepository : JpaRepository<Role, Long> {
    fun findByName(name: String): Role?

    // 可以有效的解决缓存时候session关闭的问题呢
    @Query(
        """
        select distinct r
        from Role r
        left join fetch r.permissions
        where r.name = :name
        """
    )
    fun findByNameWithPermissions(name: String): Role?

    fun existsByName(name: String): Boolean
}
