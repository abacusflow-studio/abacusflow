package org.abacusflow.portal.web.analytics

import org.abacusflow.commons.tenant.TenantContextHolder
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

@RestController
class CubeTokenController(
    @Value("\${abacusflow.cube.api-secret:}") private val cubeApiSecret: String,
) {
    @GetMapping("/api/cube-token")
    fun getCubeToken(): ResponseEntity<Map<String, String>> {
        val tenantId = TenantContextHolder.currentTenantId()

        if (cubeApiSecret.isBlank()) {
            return ResponseEntity.ok(mapOf("token" to ""))
        }

        // Generate a JWT with tenantId claim using HMAC-SHA256
        val header =
            Base64.getUrlEncoder().withoutPadding()
                .encodeToString("""{"alg":"HS256","typ":"JWT"}""".toByteArray())

        val now = System.currentTimeMillis() / 1000
        val expiresAt = now + TOKEN_TTL_SECONDS
        val payload =
            Base64.getUrlEncoder().withoutPadding()
                .encodeToString(
                    """{"sub":"abacusflow-api","tenantId":$tenantId,"iat":$now,"exp":$expiresAt}""".toByteArray(),
                )

        val hmac = Mac.getInstance("HmacSHA256")
        hmac.init(SecretKeySpec(cubeApiSecret.toByteArray(), "HmacSHA256"))
        val signature =
            Base64.getUrlEncoder().withoutPadding()
                .encodeToString(hmac.doFinal("$header.$payload".toByteArray()))

        val token = "$header.$payload.$signature"
        return ResponseEntity.ok(mapOf("token" to token))
    }

    companion object {
        private const val TOKEN_TTL_SECONDS = 300L
    }
}
