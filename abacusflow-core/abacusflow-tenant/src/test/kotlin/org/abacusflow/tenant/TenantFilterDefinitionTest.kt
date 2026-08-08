package org.abacusflow.tenant

import org.abacusflow.commons.tenant.TenantFilterParameterResolver
import org.hibernate.annotations.FilterDef
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class TenantFilterDefinitionTest {
    @Test
    fun `tenant filter is globally auto enabled with context resolver`() {
        val definition = Tenant::class.java.getAnnotation(FilterDef::class.java)
        val parameter = definition.parameters.single()

        // 防止后续改动退化成依赖业务服务手动启用租户过滤器。
        assertTrue(definition.autoEnabled)
        assertTrue(definition.applyToLoadByKey)
        assertEquals("tenantId", parameter.name)
        assertEquals(TenantFilterParameterResolver::class, parameter.resolver)
    }
}
