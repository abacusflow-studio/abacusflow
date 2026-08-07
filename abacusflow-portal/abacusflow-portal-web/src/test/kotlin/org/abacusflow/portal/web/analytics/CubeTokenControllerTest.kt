package org.abacusflow.portal.web.analytics

import org.abacusflow.commons.tenant.TenantContextHolder
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import java.nio.charset.StandardCharsets
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class CubeTokenControllerTest {
    @AfterEach
    fun clearTenantContext() {
        TenantContextHolder.clear()
    }

    @Test
    fun `weak signing secret fails controller creation`() {
        assertFailsWith<IllegalStateException> {
            CubeTokenController("too-short")
        }
    }

    @Test
    fun `issued token is tenant bound short lived and correctly signed`() {
        val secret = "a".repeat(64)
        TenantContextHolder.setTenantId(100L)

        val response = CubeTokenController(secret).getCubeToken().body!!
        val parts = response.token.split('.')

        assertEquals(3, parts.size)
        val payload = String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)
        assertTrue(payload.contains("\"tenantId\":100"))
        assertTrue(payload.contains("\"exp\":${response.expiresAt}"))

        val hmac = Mac.getInstance("HmacSHA256")
        hmac.init(SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256"))
        val expectedSignature =
            Base64.getUrlEncoder().withoutPadding().encodeToString(
                hmac.doFinal("${parts[0]}.${parts[1]}".toByteArray(StandardCharsets.UTF_8)),
            )
        assertEquals(expectedSignature, parts[2])

        val issuedAt = Regex("\"iat\":(\\d+)").find(payload)!!.groupValues[1].toLong()
        assertEquals(300L, response.expiresAt - issuedAt)
    }
}
