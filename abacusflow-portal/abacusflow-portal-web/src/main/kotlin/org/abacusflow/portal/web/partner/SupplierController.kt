package org.abacusflow.portal.web.partner

import org.abacusflow.portal.web.api.SuppliersApi
import org.abacusflow.portal.web.model.CreateSupplierInputVO
import org.abacusflow.portal.web.model.ListBasicSuppliersPage200ResponseVO
import org.abacusflow.portal.web.model.SelectableSupplierVO
import org.abacusflow.portal.web.model.SupplierVO
import org.abacusflow.portal.web.model.UpdateSupplierInputVO
import org.abacusflow.usecase.partner.CreateSupplierInputTO
import org.abacusflow.usecase.partner.UpdateSupplierInputTO
import org.abacusflow.usecase.partner.service.SupplierCommandService
import org.abacusflow.usecase.partner.service.SupplierQueryService
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class SupplierController(
    private val supplierCommandService: SupplierCommandService,
    private val supplierQueryService: SupplierQueryService,
) : SuppliersApi {
    override fun listBasicSuppliersPage(
        pageIndex: Int,
        pageSize: Int,
        name: String?,
        contactPerson: String?,
        phone: String?,
        address: String?,
    ): ResponseEntity<ListBasicSuppliersPage200ResponseVO> {
        val pageable = PageRequest.of(pageIndex - 1, pageSize)

        val page =
            supplierQueryService.listBasicSuppliersPage(
                pageable,
                name = name,
                contactPerson = contactPerson,
                phone = phone,
                address = address,
            ).map { it.toBasicVO() }

        val pageVO =
            ListBasicSuppliersPage200ResponseVO(
                content = page.content,
                totalElements = page.totalElements,
                number = page.number,
                propertySize = page.size,
            )

        return ResponseEntity.ok(pageVO)
    }

    override fun getSupplier(id: Long): ResponseEntity<SupplierVO> {
        val supplier = supplierQueryService.getSupplier(id)
        return ResponseEntity.ok(
            supplier.toVO(),
        )
    }

    override fun addSupplier(createSupplierInputVO: CreateSupplierInputVO): ResponseEntity<SupplierVO> {
        val supplier =
            supplierCommandService.createSupplier(
                CreateSupplierInputTO(
                    createSupplierInputVO.name,
                    createSupplierInputVO.contactPerson,
                    createSupplierInputVO.phone,
                    createSupplierInputVO.address,
                ),
            )
        return ResponseEntity.ok(
            supplier.toVO(),
        )
    }

    override fun updateSupplier(
        id: Long,
        updateSupplierInputVO: UpdateSupplierInputVO,
    ): ResponseEntity<SupplierVO> {
        val supplier =
            supplierCommandService.updateSupplier(
                id,
                UpdateSupplierInputTO(
                    name = updateSupplierInputVO.name,
                    contactPerson = updateSupplierInputVO.contactPerson,
                    phone = updateSupplierInputVO.phone,
                    address = updateSupplierInputVO.address,
                ),
            )
        return ResponseEntity.ok(
            supplier.toVO(),
        )
    }

    override fun deleteSupplier(id: Long): ResponseEntity<Unit> {
        supplierCommandService.deleteSupplier(id)
        return ResponseEntity.ok().build()
    }

    override fun listSelectableSuppliers(): ResponseEntity<List<SelectableSupplierVO>> {
        val productVOs =
            supplierQueryService.listSuppliers().map {
                SelectableSupplierVO(
                    it.id,
                    it.name,
                )
            }
        return ResponseEntity.ok(productVOs)
    }
}
