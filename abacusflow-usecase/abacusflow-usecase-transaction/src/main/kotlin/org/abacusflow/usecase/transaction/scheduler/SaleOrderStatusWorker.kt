package org.abacusflow.usecase.transaction.scheduler

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.abacusflow.db.transaction.SaleOrderRepository
import org.abacusflow.transaction.OrderStatus
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
class SaleOrderStatusWorker(
    private val saleOrderRepository: SaleOrderRepository,
    private val currentTenantProvider: CurrentTenantProvider,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun autoCompleteEligibleOrders(tenantId: Long) {
        check(currentTenantProvider.requireTenantId() == tenantId) {
            "Scheduled sale-order tenant context does not match worker tenant $tenantId"
        }
        val eligibleOrders =
            saleOrderRepository.findByStatusAndOrderDateBefore(
                OrderStatus.PENDING,
                LocalDate.now().minusDays(7),
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
