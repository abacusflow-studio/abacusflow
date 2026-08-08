package org.abacusflow.usecase.depot.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.generated.jooq.Tables.DEPOT
import org.abacusflow.usecase.depot.BasicDepotTO
import org.abacusflow.usecase.depot.DepotTO
import org.abacusflow.usecase.depot.service.DepotQueryService
import org.jooq.DSLContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class DepotQueryServiceImpl(
    private val jooqDsl: DSLContext,
    private val currentTenantProvider: CurrentTenantProvider,
) : DepotQueryService {
    override fun listBasicDepots(): List<BasicDepotTO> {
        val tenantId = currentTenantProvider.requireTenantId()

        // Query 侧统一使用 jOOQ，并显式保留租户条件；PostgreSQL RLS 是第二道数据库防线。
        return jooqDsl
            .select(
                DEPOT.ID,
                DEPOT.NAME,
                DEPOT.LOCATION,
                DEPOT.CAPACITY,
                DEPOT.ENABLED,
            )
            .from(DEPOT)
            .where(DEPOT.TENANT_ID.eq(tenantId))
            .orderBy(DEPOT.CREATED_AT.desc())
            .fetch { record ->
                BasicDepotTO(
                    id = record[DEPOT.ID]!!,
                    name = record[DEPOT.NAME]!!,
                    location = record[DEPOT.LOCATION],
                    capacity = record[DEPOT.CAPACITY]!!,
                    enabled = record[DEPOT.ENABLED]!!,
                )
            }
    }

    override fun getDepot(id: Long): DepotTO {
        val tenantId = currentTenantProvider.requireTenantId()

        return jooqDsl
            .select(
                DEPOT.ID,
                DEPOT.NAME,
                DEPOT.LOCATION,
                DEPOT.CAPACITY,
                DEPOT.ENABLED,
                DEPOT.CREATED_AT,
                DEPOT.UPDATED_AT,
            )
            .from(DEPOT)
            .where(DEPOT.ID.eq(id))
            .and(DEPOT.TENANT_ID.eq(tenantId))
            .fetchOne { record ->
                DepotTO(
                    id = record[DEPOT.ID]!!,
                    name = record[DEPOT.NAME]!!,
                    location = record[DEPOT.LOCATION],
                    capacity = record[DEPOT.CAPACITY]!!,
                    enabled = record[DEPOT.ENABLED]!!,
                    createdAt = record[DEPOT.CREATED_AT]!!.toInstant(),
                    updatedAt = record[DEPOT.UPDATED_AT]!!.toInstant(),
                )
            }
            ?: throw NoSuchElementException("Depot not found with id: $id")
    }
}
