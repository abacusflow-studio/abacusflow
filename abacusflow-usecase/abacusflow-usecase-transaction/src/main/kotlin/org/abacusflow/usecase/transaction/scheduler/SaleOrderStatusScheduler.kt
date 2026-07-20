package org.abacusflow.usecase.transaction.scheduler

import org.abacusflow.commons.tenant.withTenant
import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.tenant.TenantStatus
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class SaleOrderStatusScheduler(
    private val tenantRepository: TenantRepository,
    private val worker: SaleOrderStatusWorker,
) {
    private val logger = LoggerFactory.getLogger(SaleOrderStatusScheduler::class.java)

    @Scheduled(cron = "0 0 2 * * ?") // 每天凌晨2点
    fun runAutoComplete() {
        val tenants = tenantRepository.findByStatus(TenantStatus.ACTIVE)
        tenants.forEach { tenant ->
            try {
                withTenant(tenant.id) {
                    worker.autoCompleteEligibleOrders(tenant.id)
                }
            } catch (e: Exception) {
                logger.error("Failed to auto-complete sale orders for tenant ${tenant.id}", e)
            }
        }
    }
}
