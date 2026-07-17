package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.RoleRepository
import org.abacusflow.usecase.user.PermissionTO
import org.abacusflow.usecase.user.RoleTO
import org.abacusflow.usecase.user.mapper.toTO
import org.abacusflow.usecase.user.service.RoleQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class RoleQueryServiceImpl(
    private val roleRepository: RoleRepository,
    private val permissionRepository: PermissionRepository,
) : RoleQueryService {

    override fun listRoles(): List<RoleTO> {
        return roleRepository.findAll()
            .map { it.toTO() }
    }

    override fun getRole(roleId: Long): RoleTO {
        return roleRepository.findById(roleId)
            .orElseThrow { NoSuchElementException("Role $roleId not found") }
            .toTO()
    }

    override fun listPermissions(): List<PermissionTO> {
        return permissionRepository.findAllByOrderByNameAsc()
            .map { it.toTO() }
    }
}
