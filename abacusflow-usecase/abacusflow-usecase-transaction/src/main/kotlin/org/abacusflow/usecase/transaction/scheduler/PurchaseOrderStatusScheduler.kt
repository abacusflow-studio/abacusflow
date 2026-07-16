package org.abacusflow.usecase.transaction.scheduler

import org.abacusflow.db.tenant.TenantRepository
import org.abacusflow.db.transaction.PurchaseOrderRepository
import org.abacusflow.tenant.TenantStatus
import org.abacusflow.transaction.OrderStatus
import org.abacusflow.transaction.PurchaseOrder
import org.abacusflow.commons.tenant.withTenant
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Component
@Transactional
class PurchaseOrderStatusScheduler(
    private val purchaseOrderRepository: PurchaseOrderRepository,
    private val tenantRepository: TenantRepository,
) {
    private val logger = LoggerFactory.getLogger(PurchaseOrderStatusScheduler::class.java)

    @Scheduled(cron = "0 0 2 * * ?") // 每天凌晨2点
    fun runAutoComplete() {
        val tenants = tenantRepository.findByStatus(TenantStatus.ACTIVE)
        tenants.forEach { tenant ->
            try {
                withTenant(tenant.id) {
                    autoCompleteEligibleOrderStatus(tenant.id)
                }
            } catch (e: Exception) {
                logger.error("Failed to auto-complete purchase orders for tenant ${tenant.id}", e)
            }
        }
    }

    private fun autoCompleteEligibleOrderStatus(tenantId: Long) {
        val sevenDaysAgo = LocalDate.now().minusDays(7)
        val eligibleOrders = purchaseOrderRepository.findByStatusAndOrderDateBefore(
            OrderStatus.PENDING, sevenDaysAgo,
        )
        eligibleOrders.forEach { order ->
            try {
                order.completeOrder()
            } catch (e: Exception) {
                logger.warn("Failed to auto-complete purchase order ${order.id}: ${e.message}")
            }
        }
        purchaseOrderRepository.saveAll(eligibleOrders)
        logger.info("Auto-completed ${eligibleOrders.size} purchase orders for tenant $tenantId")
    }
}
