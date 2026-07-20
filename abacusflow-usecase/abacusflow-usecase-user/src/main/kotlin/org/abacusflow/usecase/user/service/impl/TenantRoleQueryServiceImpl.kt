package org.abacusflow.usecase.user.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.db.user.TenantRoleRepository
import org.abacusflow.usecase.user.PermissionTO
import org.abacusflow.usecase.user.TenantRoleTO
import org.abacusflow.usecase.user.mapper.toTO
import org.abacusflow.usecase.user.service.TenantRoleQueryService
import org.abacusflow.user.PermissionScope
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class TenantRoleQueryServiceImpl(
    private val roleRepository: TenantRoleRepository,
    private val permissionRepository: PermissionRepository,
    private val currentTenantProvider: CurrentTenantProvider,
) : TenantRoleQueryService {
    override fun listRoles(): List<TenantRoleTO> {
        currentTenantProvider.requireTenantId()
        return roleRepository.findAll()
            .map { it.toTO() }
    }

    override fun getRole(roleId: Long): TenantRoleTO {
        currentTenantProvider.requireTenantId()
        return roleRepository.findById(roleId)
            .orElseThrow { NoSuchElementException("Role $roleId not found") }
            .toTO()
    }

    override fun listTenantAssignablePermissions(): List<PermissionTO> {
        currentTenantProvider.requireTenantId()
        return permissionRepository
            .findAllByScopeInOrderByNameAsc(setOf(PermissionScope.TENANT, PermissionScope.BUSINESS))
            .map { it.toTO() }
    }

    override fun listPermissions(): List<PermissionTO> {
        return permissionRepository.findAllByOrderByNameAsc()
            .map { it.toTO() }
    }
}
