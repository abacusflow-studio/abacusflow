package org.abacusflow.usecase.commons.jooq

import org.jooq.ExecuteListenerProvider
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * jOOQ 租户隔离配置。
 *
 * 注册 [TenantRlsExecuteListener] 到 Spring Boot 的 jOOQ 自动配置中，
 * 使得每条 jOOQ 查询执行前自动设置 PostgreSQL RLS 变量。
 */
@Configuration
class JooqTenantConfig {
    @Bean
    fun tenantRlsExecuteListenerProvider(): ExecuteListenerProvider =
        ExecuteListenerProvider { TenantRlsExecuteListener() }
}
