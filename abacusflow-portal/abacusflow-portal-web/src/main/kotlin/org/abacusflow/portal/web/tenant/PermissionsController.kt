package org.abacusflow.portal.web.tenant

import org.abacusflow.portal.web.api.PermissionsApi
import org.abacusflow.portal.web.model.CreatePermissionInputVO
import org.abacusflow.portal.web.model.PermissionVO
import org.abacusflow.portal.web.model.UpdatePermissionInputVO
import org.abacusflow.portal.web.user.toPermissionVO
import org.abacusflow.usecase.user.service.PermissionCommandService
import org.abacusflow.usecase.user.service.RoleQueryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class PermissionsController(
    private val roleQueryService: RoleQueryService,
    private val permissionCommandService: PermissionCommandService,
) : PermissionsApi {

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
