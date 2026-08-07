package org.abacusflow.portal.web.analytics

import org.abacusflow.commons.tenant.TenantContextHolder
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.nio.charset.StandardCharsets
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

@RestController
class CubeTokenController(
    @Value("\${abacusflow.cube.api-secret}") private val cubeApiSecret: String,
) {
    init {
        check(cubeApiSecret.length >= MIN_SECRET_LENGTH) {
            "abacusflow.cube.api-secret must contain at least $MIN_SECRET_LENGTH characters"
        }
    }

    @GetMapping("/api/cube-token")
    fun getCubeToken(): ResponseEntity<CubeTokenResponse> {
        val tenantId = TenantContextHolder.currentTenantId()

        // Generate a JWT with tenantId claim using HMAC-SHA256
        val header =
            Base64.getUrlEncoder().withoutPadding()
                .encodeToString("""{"alg":"HS256","typ":"JWT"}""".toByteArray(StandardCharsets.UTF_8))

        val now = System.currentTimeMillis() / 1000
        val expiresAt = now + TOKEN_TTL_SECONDS
        val payload =
            Base64.getUrlEncoder().withoutPadding()
                .encodeToString(
                    """{"sub":"abacusflow-api","tenantId":$tenantId,"iat":$now,"exp":$expiresAt}"""
                        .toByteArray(StandardCharsets.UTF_8),
                )

        val hmac = Mac.getInstance("HmacSHA256")
        hmac.init(SecretKeySpec(cubeApiSecret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256"))
        val signature =
            Base64.getUrlEncoder().withoutPadding()
                .encodeToString(hmac.doFinal("$header.$payload".toByteArray(StandardCharsets.UTF_8)))

        val token = "$header.$payload.$signature"
        return ResponseEntity.ok(CubeTokenResponse(token = token, expiresAt = expiresAt))
    }

    companion object {
        private const val MIN_SECRET_LENGTH = 32
        private const val TOKEN_TTL_SECONDS = 300L
    }
}

data class CubeTokenResponse(
    val token: String,
    val expiresAt: Long,
)
