package org.abacusflow.usecase.depot.service

import org.abacusflow.usecase.depot.BasicDepotTO
import org.abacusflow.usecase.depot.DepotTO
import org.springframework.security.access.prepost.PreAuthorize

interface DepotQueryService {
    @PreAuthorize("hasAuthority('depot:read')")
    fun getDepot(id: Long): DepotTO

    @PreAuthorize("hasAuthority('depot:read')")
    fun listBasicDepots(): List<BasicDepotTO>
}
