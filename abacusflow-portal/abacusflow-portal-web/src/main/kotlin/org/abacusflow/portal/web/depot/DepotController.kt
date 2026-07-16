package org.abacusflow.portal.web.depot

import org.abacusflow.portal.web.api.DepotsApi
import org.abacusflow.portal.web.model.BasicDepotVO
import org.abacusflow.portal.web.model.CreateDepotInputVO
import org.abacusflow.portal.web.model.DepotVO
import org.abacusflow.portal.web.model.UpdateDepotInputVO
import org.abacusflow.usecase.depot.CreateDepotInputTO
import org.abacusflow.usecase.depot.UpdateDepotInputTO
import org.abacusflow.usecase.depot.service.DepotCommandService
import org.abacusflow.usecase.depot.service.DepotQueryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class DepotController(
    private val depotCommandService: DepotCommandService,
    private val depotQueryService: DepotQueryService,
) : DepotsApi {
    override fun listBasicDepots(): ResponseEntity<List<BasicDepotVO>> {
        val depotVOs =
            depotQueryService.listBasicDepots().map { depot ->
                depot.toBasicTO()
            }
        return ResponseEntity.ok(depotVOs)
    }

    override fun getDepot(id: Long): ResponseEntity<DepotVO> {
        val depot = depotQueryService.getDepot(id)
        return ResponseEntity.ok(
            depot.toTO(),
        )
    }

    override fun addDepot(createDepotInputVO: CreateDepotInputVO): ResponseEntity<DepotVO> {
        val depot =
            depotCommandService.createDepot(
                CreateDepotInputTO(
                    createDepotInputVO.name,
                    createDepotInputVO.location,
                    createDepotInputVO.capacity,
                ),
            )
        return ResponseEntity.ok(
            depot.toTO(),
        )
    }

    override fun updateDepot(
        id: Long,
        updateDepotInputVO: UpdateDepotInputVO,
    ): ResponseEntity<DepotVO> {
        val depot =
            depotCommandService.updateDepot(
                id,
                UpdateDepotInputTO(
                    name = updateDepotInputVO.name,
                    location = updateDepotInputVO.location,
                    capacity = updateDepotInputVO.capacity,
                ),
            )
        return ResponseEntity.ok(
            depot.toTO(),
        )
    }

    override fun deleteDepot(id: Long): ResponseEntity<Unit> {
        depotCommandService.deleteDepot(id)
        return ResponseEntity.ok().build()
    }
}
