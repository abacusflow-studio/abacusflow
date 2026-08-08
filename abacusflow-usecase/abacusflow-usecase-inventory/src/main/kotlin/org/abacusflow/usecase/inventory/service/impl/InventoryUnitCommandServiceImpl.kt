package org.abacusflow.usecase.inventory.service.impl

import org.abacusflow.db.depot.DepotRepository
import org.abacusflow.db.inventory.InventoryUnitRepository
import org.abacusflow.usecase.inventory.service.InventoryUnitCommandService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class InventoryUnitCommandServiceImpl(
    private val inventoryUnitRepository: InventoryUnitRepository,
    private val depotRepository: DepotRepository,
) : InventoryUnitCommandService {
    override fun assignDepot(
        id: Long,
        newDepotId: Long,
    ) {
        val inventoryUnit =
            inventoryUnitRepository.findById(id)
                .orElseThrow { NoSuchElementException("Inventory unit not found") }

        val depot =
            depotRepository.findById(newDepotId)
                .orElseThrow { NoSuchElementException("Depot not found") }

        inventoryUnit.assignDepot(newDepotId)

        inventoryUnitRepository.save(inventoryUnit)
    }
}
