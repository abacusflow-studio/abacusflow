package org.abacusflow.usecase.inventory.service.impl

import org.abacusflow.db.depot.DepotRepository
import org.abacusflow.db.inventory.InventoryUnitRepository
import org.abacusflow.depot.Depot
import org.abacusflow.inventory.InventoryUnit
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.Optional
import kotlin.test.assertFailsWith

class InventoryUnitCommandServiceImplTest {
    private val inventoryUnitRepository = mock(InventoryUnitRepository::class.java)
    private val depotRepository = mock(DepotRepository::class.java)
    private val service = InventoryUnitCommandServiceImpl(inventoryUnitRepository, depotRepository)

    @Test
    fun `cross tenant depot assignment is rejected before saving`() {
        val inventoryUnit = mock(InventoryUnit::class.java)
        val foreignDepot = mock(Depot::class.java)
        `when`(inventoryUnit.tenantId).thenReturn(100L)
        `when`(foreignDepot.tenantId).thenReturn(200L)
        `when`(inventoryUnitRepository.findById(1L)).thenReturn(Optional.of(inventoryUnit))
        `when`(depotRepository.findById(2L)).thenReturn(Optional.of(foreignDepot))

        assertFailsWith<IllegalArgumentException> {
            service.assignDepot(1L, 2L)
        }

        // 跨租户校验失败后不能把非法关联写入数据库。
        verify(inventoryUnitRepository, never()).save(inventoryUnit)
    }
}
