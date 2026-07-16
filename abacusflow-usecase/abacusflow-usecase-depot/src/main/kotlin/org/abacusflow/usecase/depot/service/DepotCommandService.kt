package org.abacusflow.usecase.depot.service

import org.abacusflow.usecase.depot.CreateDepotInputTO
import org.abacusflow.usecase.depot.DepotTO
import org.abacusflow.usecase.depot.UpdateDepotInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface DepotCommandService {
    @PreAuthorize("hasAuthority('depot:create')")
    fun createDepot(input: CreateDepotInputTO): DepotTO

    @PreAuthorize("hasAuthority('depot:update')")
    fun updateDepot(
        id: Long,
        input: UpdateDepotInputTO,
    ): DepotTO

    @PreAuthorize("hasAuthority('depot:delete')")
    fun deleteDepot(id: Long): DepotTO
}
