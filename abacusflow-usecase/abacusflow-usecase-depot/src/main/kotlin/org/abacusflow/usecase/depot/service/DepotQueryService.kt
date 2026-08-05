package org.abacusflow.usecase.depot.service

import org.abacusflow.usecase.commons.security.RequiredAuthority
import org.abacusflow.usecase.depot.BasicDepotTO
import org.abacusflow.usecase.depot.DepotTO
import org.springframework.security.access.prepost.PreAuthorize

interface DepotQueryService {
    @PreAuthorize(RequiredAuthority.BUSINESS_DEPOT_READ)
    fun getDepot(id: Long): DepotTO

    @PreAuthorize(RequiredAuthority.BUSINESS_DEPOT_READ)
    fun listBasicDepots(): List<BasicDepotTO>
}
