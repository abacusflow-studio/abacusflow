package org.abacusflow.usecase.depot.service.impl

import org.abacusflow.db.depot.DepotRepository
import org.abacusflow.depot.Depot
import org.abacusflow.usecase.depot.CreateDepotInputTO
import org.abacusflow.usecase.depot.DepotTO
import org.abacusflow.usecase.depot.UpdateDepotInputTO
import org.abacusflow.usecase.depot.mapper.toTO
import org.abacusflow.usecase.depot.service.DepotCommandService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class DepotCommandServiceImpl(
    private val depotRepository: DepotRepository,
) : DepotCommandService {
    override fun createDepot(input: CreateDepotInputTO): DepotTO {
        require(!depotRepository.existsByName(input.name)) {
            "Depot with name '${input.name}' already exists"
        }

        val newDepot =
            Depot(
                name = input.name,
                location = input.location,
                capacity = input.capacity,
            )

        return depotRepository.save(newDepot).toTO()
    }

    override fun updateDepot(
        id: Long,
        input: UpdateDepotInputTO,
    ): DepotTO {
        val depot =
            depotRepository
                .findById(id)
                .orElseThrow { NoSuchElementException("Depot not found with id: $id") }

        input.name?.let { newName ->
            if (newName != depot.name) {
                require(!depotRepository.existsByName(newName)) {
                    "Depot with name '$newName' already exists"
                }
            }
        }

        depot.updateDepotInfo(
            newName = input.name,
            newLocation = input.location,
            newCapacity = input.capacity,
        )

        return depotRepository.save(depot).toTO()
    }

    override fun deleteDepot(id: Long): DepotTO {
        val depot =
            depotRepository
                .findById(id)
                .orElseThrow { NoSuchElementException("Depot not found with id: $id") }

        depotRepository.delete(depot)
        return depot.toTO()
    }
}
