package org.abacusflow.portal.web.tenant

import org.abacusflow.portal.web.api.PermissionsApi
import org.abacusflow.portal.web.api.RolesApi
import org.abacusflow.portal.web.model.CreatePermissionInputVO
import org.abacusflow.portal.web.model.CreateRoleInputVO
import org.abacusflow.portal.web.model.PermissionVO
import org.abacusflow.portal.web.model.RoleVO
import org.abacusflow.portal.web.model.UpdatePermissionInputVO
import org.abacusflow.portal.web.model.UpdateRoleInputVO
import org.abacusflow.usecase.user.CreateRoleInputTO
import org.abacusflow.usecase.user.UpdateRoleInputTO
import org.abacusflow.usecase.user.mapper.toTO
import org.abacusflow.usecase.user.service.PermissionCommandService
import org.abacusflow.usecase.user.service.RoleCommandService
import org.abacusflow.usecase.user.service.RoleQueryService
import org.abacusflow.portal.web.user.toPermissionVO
import org.abacusflow.portal.web.user.toRoleVO
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class RolesController(
    private val roleQueryService: RoleQueryService,
    private val roleCommandService: RoleCommandService,
    private val permissionCommandService: PermissionCommandService,
) : RolesApi, PermissionsApi {

    // ---- Roles ----

    override fun listRoles(): ResponseEntity<List<RoleVO>> {
        val roles = roleQueryService.listRoles()
        return ResponseEntity.ok(roles.map { it.toRoleVO() })
    }

    override fun createRole(createRoleInputVO: CreateRoleInputVO): ResponseEntity<RoleVO> {
        val input = CreateRoleInputTO(
            name = createRoleInputVO.name,
            label = createRoleInputVO.label,
            permissionIds = createRoleInputVO.permissionIds ?: emptyList(),
        )
        val role = roleCommandService.createRole(input)
        return ResponseEntity.status(201).body(role.toRoleVO())
    }

    override fun getRole(roleId: Long): ResponseEntity<RoleVO> {
        val role = roleQueryService.getRole(roleId)
        return ResponseEntity.ok(role.toRoleVO())
    }

    override fun updateRole(roleId: Long, updateRoleInputVO: UpdateRoleInputVO): ResponseEntity<RoleVO> {
        val input = UpdateRoleInputTO(
            label = updateRoleInputVO.label,
            permissionIds = updateRoleInputVO.permissionIds ?: emptyList(),
        )
        val role = roleCommandService.updateRole(roleId, input)
        return ResponseEntity.ok(role.toRoleVO())
    }

    override fun deleteRole(roleId: Long): ResponseEntity<Unit> {
        roleCommandService.deleteRole(roleId)
        return ResponseEntity.ok().build()
    }

    // ---- Permissions ----

    override fun listPermissions(): ResponseEntity<List<PermissionVO>> {
        val permissions = roleQueryService.listPermissions()
        return ResponseEntity.ok(permissions.map { it.toPermissionVO() })
    }

    override fun createPermission(createPermissionInputVO: CreatePermissionInputVO): ResponseEntity<PermissionVO> {
        val permission = permissionCommandService.createPermission(
            name = createPermissionInputVO.name,
            label = createPermissionInputVO.label,
            description = createPermissionInputVO.description,
        )
        return ResponseEntity.status(201).body(permission.toPermissionVO())
    }

    override fun updatePermission(permissionId: Long, updatePermissionInputVO: UpdatePermissionInputVO): ResponseEntity<PermissionVO> {
        val permission = permissionCommandService.updatePermission(
            id = permissionId,
            label = updatePermissionInputVO.label,
            description = updatePermissionInputVO.description,
        )
        return ResponseEntity.ok(permission.toPermissionVO())
    }

    override fun deletePermission(permissionId: Long): ResponseEntity<Unit> {
        permissionCommandService.deletePermission(permissionId)
        return ResponseEntity.ok().build()
    }
}
