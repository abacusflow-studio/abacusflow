package org.abacusflow.usecase.user.service.impl

import org.abacusflow.db.user.PermissionRepository
import org.abacusflow.usecase.user.PermissionTO
import org.abacusflow.usecase.user.mapper.toTO
import org.abacusflow.usecase.user.service.PermissionCommandService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class PermissionCommandServiceImpl(
    private val permissionRepository: PermissionRepository,
) : PermissionCommandService {
    override fun updatePermission(
        id: Long,
        label: String?,
        description: String?,
    ): PermissionTO {
        val permission =
            permissionRepository.findById(id)
                .orElseThrow { NoSuchElementException("Permission $id not found") }

        permission.updateProfile(label = label, description = description)

        return permissionRepository.save(permission).toTO()
    }
}
