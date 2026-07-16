package org.abacusflow.usecase.transaction.scheduler

import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.transaction.SaleOrderRepository
import org.abacusflow.tenant.TenantStatus
import org.abacusflow.transaction.OrderStatus
import org.abacusflow.transaction.SaleOrder
import org.abacusflow.commons.tenant.withTenant
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Component
@Transactional
class SaleOrderStatusScheduler(
    private val saleOrderRepository: SaleOrderRepository,
    private val tenantRepository: TenantRepository,
) {
    private val logger = LoggerFactory.getLogger(SaleOrderStatusScheduler::class.java)

    @Scheduled(cron = "0 0 2 * * ?") // 每天凌晨2点
    fun runAutoComplete() {
        val tenants = tenantRepository.findByStatus(TenantStatus.ACTIVE)
        tenants.forEach { tenant ->
            try {
                withTenant(tenant.id) {
                    autoCompleteEligibleOrderStatus(tenant.id)
                }
            } catch (e: Exception) {
                logger.error("Failed to auto-complete sale orders for tenant ${tenant.id}", e)
            }
        }
    }

    private fun autoCompleteEligibleOrderStatus(tenantId: Long) {
        val sevenDaysAgo = LocalDate.now().minusDays(7)
        val eligibleOrders = saleOrderRepository.findByStatusAndOrderDateBefore(
            OrderStatus.PENDING, sevenDaysAgo,
        )
        eligibleOrders.forEach { order ->
            try {
                order.completeOrder()
            } catch (e: Exception) {
                logger.warn("Failed to auto-complete sale order ${order.id}: ${e.message}")
            }
        }
        saleOrderRepository.saveAll(eligibleOrders)
        logger.info("Auto-completed ${eligibleOrders.size} sale orders for tenant $tenantId")
    }
}
