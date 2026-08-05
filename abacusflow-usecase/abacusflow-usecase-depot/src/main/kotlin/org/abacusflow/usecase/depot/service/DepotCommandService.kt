package org.abacusflow.usecase.depot.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.depot.CreateDepotInputTO
import org.abacusflow.usecase.depot.DepotTO
import org.abacusflow.usecase.depot.UpdateDepotInputTO
import org.springframework.security.access.prepost.PreAuthorize

interface DepotCommandService {
    @PreAuthorize(RequiredAuthority.BUSINESS_DEPOT_CREATE)
    fun createDepot(input: CreateDepotInputTO): DepotTO

    @PreAuthorize(RequiredAuthority.BUSINESS_DEPOT_UPDATE)
    fun updateDepot(
        id: Long,
        input: UpdateDepotInputTO,
    ): DepotTO

    @PreAuthorize(RequiredAuthority.BUSINESS_DEPOT_DELETE)
    fun deleteDepot(id: Long): DepotTO
}
