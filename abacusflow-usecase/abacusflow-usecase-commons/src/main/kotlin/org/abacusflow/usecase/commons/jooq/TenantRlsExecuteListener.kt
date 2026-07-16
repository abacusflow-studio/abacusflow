package org.abacusflow.usecase.commons.jooq

import org.abacusflow.commons.tenant.TenantContextHolder
import org.jooq.ExecuteContext
import org.jooq.impl.DefaultExecuteListener

/**
 * jOOQ 执行监听器，在每条 SQL 执行前自动设置 PostgreSQL RLS 变量。
 *
 * 当 [TenantContextHolder] 中有租户上下文时，自动执行：
 * ```sql
 * SELECT set_config('app.tenant_id', '<tenantId>', true)
 * ```
 *
 * 这使得所有 jOOQ 查询自动受 PostgreSQL RLS 策略保护，
 * 无需在每个查询中手动添加 `TENANT_ID.eq(tenantId)` 条件。
 *
 * 与 Hibernate Filter + TenantFilterAspect 形成双重防线：
 * - Hibernate Filter：JPA 查询自动追加 `WHERE tenant_id = :tenantId`
 * - PostgreSQL RLS：数据库层强制隔离（覆盖 JPA + jOOQ + native query）
 */
class TenantRlsExecuteListener : DefaultExecuteListener() {
    override fun executeStart(ctx: ExecuteContext) {
        val tenantId = TenantContextHolder.currentTenantIdOrNull() ?: return
        ctx.connection().createStatement()
            .execute("SELECT set_config('app.tenant_id', '$tenantId', true)")
    }
}
