package org.abacusflow.db

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component

/** 在当前数据库事务连接中设置 PostgreSQL RLS 使用的租户变量。 */
@Component
class TenantPersistenceContext(
    private val jdbcTemplate: JdbcTemplate,
) {
    fun activate(tenantId: Long) {
        jdbcTemplate.queryForObject(
            "SELECT set_config('app.tenant_id', ?, true)",
            String::class.java,
            tenantId.toString(),
        )
    }
}
