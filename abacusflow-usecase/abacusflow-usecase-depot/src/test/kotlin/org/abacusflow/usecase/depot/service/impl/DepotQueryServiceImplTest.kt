package org.abacusflow.usecase.depot.service.impl

import org.abacusflow.commons.tenant.CurrentTenantProvider
import org.jooq.SQLDialect
import org.jooq.impl.DSL
import org.jooq.tools.jdbc.MockConnection
import org.jooq.tools.jdbc.MockDataProvider
import org.jooq.tools.jdbc.MockExecuteContext
import org.jooq.tools.jdbc.MockResult
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.transaction.annotation.Transactional

class DepotQueryServiceImplTest {
    private val currentTenantProvider = CurrentTenantProvider()

    @AfterEach
    fun clearTenantContext() {
        currentTenantProvider.clear()
    }

    @Test
    fun `list query uses jooq tenant condition inside a read only transaction`() {
        val executions = mutableListOf<MockExecuteContext>()
        val connection =
            MockConnection(
                MockDataProvider { context ->
                    executions += context
                    arrayOf(MockResult(0, DSL.using(SQLDialect.POSTGRES).newResult()))
                },
            )
        currentTenantProvider.setTenantId(100L)
        val service = DepotQueryServiceImpl(DSL.using(connection, SQLDialect.POSTGRES), currentTenantProvider)

        assertEquals(emptyList<Any>(), service.listBasicDepots())

        val execution = executions.single()
        // 显式租户条件是查询层防线，RLS 监听器是数据库层防线。
        assertTrue(execution.sql().contains("tenant_id", ignoreCase = true))
        assertEquals(listOf(100L), execution.bindings().toList())
        val transactional = DepotQueryServiceImpl::class.java.getAnnotation(Transactional::class.java)
        assertTrue(transactional.readOnly)
    }

    @Test
    fun `detail query restricts both depot id and tenant id`() {
        val executions = mutableListOf<MockExecuteContext>()
        val connection =
            MockConnection(
                MockDataProvider { context ->
                    executions += context
                    arrayOf(MockResult(0, DSL.using(SQLDialect.POSTGRES).newResult()))
                },
            )
        currentTenantProvider.setTenantId(100L)
        val service = DepotQueryServiceImpl(DSL.using(connection, SQLDialect.POSTGRES), currentTenantProvider)

        assertThrows<NoSuchElementException> { service.getDepot(42L) }

        val execution = executions.single()
        assertTrue(execution.sql().contains("tenant_id", ignoreCase = true))
        assertTrue(execution.sql().contains("id", ignoreCase = true))
        assertEquals(listOf(42L, 100L), execution.bindings().toList())
    }
}
