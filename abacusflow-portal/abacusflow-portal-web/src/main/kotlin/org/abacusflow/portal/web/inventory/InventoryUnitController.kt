package org.abacusflow.portal.web.inventory

import org.abacusflow.portal.web.api.InventoryUnitsApi
import org.abacusflow.portal.web.api.NotFoundException
import org.abacusflow.portal.web.model.AssignInventoryUnitDepotRequestVO
import org.abacusflow.portal.web.model.InventoryUnitStatusVO
import org.abacusflow.portal.web.model.InventoryUnitVO
import org.abacusflow.portal.web.model.ListBasicInventoryUnitsPage200ResponseVO
import org.abacusflow.portal.web.model.ProductTypeVO
import org.abacusflow.portal.web.model.SelectableInventoryUnitVO
import org.abacusflow.usecase.inventory.service.InventoryUnitCommandService
import org.abacusflow.usecase.inventory.service.InventoryUnitQueryService
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class InventoryUnitController(
    private val inventoryUnitQueryService: InventoryUnitQueryService,
    private val inventoryUnitCommandService: InventoryUnitCommandService,
) : InventoryUnitsApi {
    override fun listBasicInventoryUnitsPage(
        pageIndex: Int,
        pageSize: Int,
        productCategoryId: Long?,
        productName: String?,
        productType: ProductTypeVO?,
        inventoryUnitCode: String?,
        depotName: String?,
    ): ResponseEntity<ListBasicInventoryUnitsPage200ResponseVO> {
        val pageable = PageRequest.of(pageIndex - 1, pageSize)

        val page =
            inventoryUnitQueryService.listBasicInventoryUnits(
                pageable,
                productCategoryId,
                productName,
                productType?.name?.uppercase(),
                inventoryUnitCode,
                depotName,
            ).map { it.toBasicVO() }

        val pageVO =
            ListBasicInventoryUnitsPage200ResponseVO(
                content = page.content,
                totalElements = page.totalElements,
                number = page.number,
                propertySize = page.size,
            )

        return ResponseEntity.ok(pageVO)
    }

    override fun listSelectableInventoryUnits(statuses: List<InventoryUnitStatusVO>?): ResponseEntity<List<SelectableInventoryUnitVO>> {
        val unitVOS =
            inventoryUnitQueryService.listInventoryUnitsWithTitle(
                statuses?.map { it.name },
            ).map { unit ->
                SelectableInventoryUnitVO(
                    id = unit.id,
                    type = mapInventoryUnitTypeTOToVO(unit.type),
                    title = unit.title,
                    status = mapInventoryUnitStatusTOToVO(unit.status),
                )
            }
        return ResponseEntity.ok(unitVOS)
    }

    override fun getInventoryUnit(id: Long): ResponseEntity<InventoryUnitVO> {
        val inventory =
            inventoryUnitQueryService.getInventoryUnit(id)
                ?: throw NotFoundException("Could not find inventory unit for id $id")
        return ResponseEntity.ok(
            inventory.toVO(),
        )
    }

    override fun assignInventoryUnitDepot(
        id: Long,
        assignInventoryUnitDepotRequestVO: AssignInventoryUnitDepotRequestVO,
    ): ResponseEntity<Unit> {
        inventoryUnitCommandService.assignDepot(id, assignInventoryUnitDepotRequestVO.depotId)
        return ResponseEntity.ok().build()
    }
}
