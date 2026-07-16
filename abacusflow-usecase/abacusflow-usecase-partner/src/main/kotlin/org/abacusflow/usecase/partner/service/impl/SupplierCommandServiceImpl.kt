package org.abacusflow.usecase.partner.service.impl

import org.abacusflow.db.partner.SupplierRepository
import org.abacusflow.partner.Supplier
import org.abacusflow.usecase.partner.CreateSupplierInputTO
import org.abacusflow.usecase.partner.SupplierTO
import org.abacusflow.usecase.partner.UpdateSupplierInputTO
import org.abacusflow.usecase.partner.mapper.toTO
import org.abacusflow.usecase.partner.service.SupplierCommandService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class SupplierCommandServiceImpl(
    private val supplierRepository: SupplierRepository,
) : SupplierCommandService {
    override fun createSupplier(supplier: CreateSupplierInputTO): SupplierTO {
        require(!supplierRepository.existsByName(supplier.name)) {
            "Supplier with name '${supplier.name}' already exists"
        }

        val newSupplier =
            Supplier(
                name = supplier.name,
                phone = supplier.phone,
                contactPerson = supplier.contactPerson,
                address = supplier.address,
            )
        return supplierRepository.save(newSupplier).toTO()
    }

    override fun updateSupplier(
        id: Long,
        supplierTO: UpdateSupplierInputTO,
    ): SupplierTO {
        val supplier =
            supplierRepository
                .findById(id)
                .orElseThrow { NoSuchElementException("Supplier not found with id: $id") }

        supplierTO.name?.let { newName ->
            if (newName != supplier.name) {
                require(!supplierRepository.existsByName(newName)) {
                    "Supplier with name '$newName' already exists"
                }
            }
        }

        supplier.updateContactInfo(
            newName = supplierTO.name,
            newContactPerson = supplierTO.contactPerson,
            newPhone = supplierTO.phone,
            newAddress = supplierTO.address,
        )
        return supplierRepository.save(supplier).toTO()
    }

    override fun deleteSupplier(id: Long): SupplierTO {
        val supplier =
            supplierRepository
                .findById(id)
                .orElseThrow { NoSuchElementException("Supplier not found with id: $id") }
        supplierRepository.delete(supplier)
        return supplier.toTO()
    }
}
