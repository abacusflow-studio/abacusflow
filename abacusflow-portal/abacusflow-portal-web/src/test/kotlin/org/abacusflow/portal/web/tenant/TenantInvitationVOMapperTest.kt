package org.abacusflow.portal.web.tenant

import org.abacusflow.usecase.tenant.TenantInvitationTO
import org.junit.jupiter.api.Test
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TenantInvitationVOMapperTest {
    private val invitation =
        TenantInvitationTO(
            id = 1,
            tenantId = 2,
            tenantName = "pending-tenant",
            email = "admin@example.com",
            roleIds = listOf(3),
            roleNames = listOf("admin"),
            invitedByUserId = 4,
            token = "one-time-secret",
            status = "PENDING",
            expiresAt = Instant.parse("2026-08-01T00:00:00Z"),
            acceptedAt = null,
            createdAt = Instant.parse("2026-07-19T00:00:00Z"),
            initialAdministrator = true,
        )

    @Test
    fun `normal invitation responses hide delivery token`() {
        assertNull(invitation.toVO().token)
    }

    @Test
    fun `creation and reissue responses may include delivery token once`() {
        assertEquals("one-time-secret", invitation.toVO(includeToken = true).token)
    }
}
