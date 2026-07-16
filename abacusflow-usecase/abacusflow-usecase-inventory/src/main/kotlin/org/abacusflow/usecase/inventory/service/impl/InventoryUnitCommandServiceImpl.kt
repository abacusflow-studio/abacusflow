package org.abacusflow.usecase.inventory.service.impl

import org.abacusflow.db.inventory.InventoryUnitRepository
import org.abacusflow.usecase.inventory.service.InventoryUnitCommandService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class InventoryUnitCommandServiceImpl(
    private val inventoryUnitRepository: InventoryUnitRepository,
) : InventoryUnitCommandService {
    override fun assignDepot(
        id: Long,
        newDepotId: Long,
    ) {
        val inventoryUnit =
            inventoryUnitRepository.findById(id)
                .orElseThrow { NoSuchElementException("Inventory unit not found") }

        inventoryUnit.assignDepot(newDepotId)

        inventoryUnitRepository.save(inventoryUnit)
    }
}
