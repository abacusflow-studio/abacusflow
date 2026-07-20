package org.abacusflow.db.user

import org.abacusflow.user.PlatformUserRole
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface PlatformUserRoleRepository : JpaRepository<PlatformUserRole, Long> {
    @EntityGraph(attributePaths = ["role", "role.permissionsMutable"])
    fun findAllByUserId(userId: Long): List<PlatformUserRole>

    fun findAllByRoleId(roleId: Long): List<PlatformUserRole>

    fun findByUserIdAndRoleId(
        userId: Long,
        roleId: Long,
    ): PlatformUserRole?

    fun existsByUserIdAndRoleId(
        userId: Long,
        roleId: Long,
    ): Boolean

    fun existsByRoleId(roleId: Long): Boolean

    @Query(
        """
        select count(distinct assignment.user.id)
        from PlatformUserRole assignment
        join assignment.role role
        join role.permissionsMutable permission
        where permission.name = :permissionName
          and assignment.user.enabled = true
          and assignment.user.locked = false
        """,
    )
    fun countActiveUsersWithPermission(
        @Param("permissionName") permissionName: String,
    ): Long

    @Query(
        """
        select count(assignment) > 0
        from PlatformUserRole assignment
        join assignment.role role
        join role.permissionsMutable permission
        where assignment.user.id = :userId
          and role.id <> :excludedRoleId
          and permission.name = :permissionName
        """,
    )
    fun userHasPermissionThroughAnotherRole(
        @Param("userId") userId: Long,
        @Param("excludedRoleId") excludedRoleId: Long,
        @Param("permissionName") permissionName: String,
    ): Boolean
}
