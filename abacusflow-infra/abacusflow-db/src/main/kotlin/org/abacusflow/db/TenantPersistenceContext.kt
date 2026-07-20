package org.abacusflow.db

import jakarta.persistence.EntityManager
import org.hibernate.Session
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component

/** Activates Hibernate Filter and PostgreSQL RLS on the current transaction. */
@Component
class TenantPersistenceContext(
    private val entityManager: EntityManager,
    private val jdbcTemplate: JdbcTemplate,
) {
    fun activate(tenantId: Long) {
        entityManager.unwrap(Session::class.java)
            .enableFilter("tenantFilter")
            .setParameter("tenantId", tenantId)
        jdbcTemplate.queryForObject(
            "SELECT set_config('app.tenant_id', ?, true)",
            String::class.java,
            tenantId.toString(),
        )
    }
}
