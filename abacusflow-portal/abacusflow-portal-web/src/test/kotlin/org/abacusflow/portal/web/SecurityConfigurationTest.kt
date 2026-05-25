package org.abacusflow.portal.web

import jakarta.servlet.http.Cookie
import org.abacusflow.usecase.user.AuthenticatedUserTO
import org.abacusflow.usecase.user.service.ExternalIdentityAuthenticationService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.http.HttpHeaders
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.oauth2.jwt.BadJwtException
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.context.ContextConfiguration
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

private const val TEST_ISSUER = "https://issuer.abacusflow.test/"
private const val TEST_AUDIENCE = "https://api.abacusflow.test"
private const val PROTECTED_PATH = "/security-probe"
private const val PERMISSION_PATH = "/security-probe/user-permission"
private const val BOOTSTRAP_PATH = "/me/bootstrap"

@WebMvcTest(
    controllers = [SecurityProbeController::class],
    properties = [
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=$TEST_ISSUER",
        "spring.security.oauth2.resourceserver.jwt.audiences[0]=$TEST_AUDIENCE",
    ],
)
@ContextConfiguration(
    classes = [
        SecurityProbeController::class,
        SecurityConfiguration::class,
        SecurityConfigurationTest.JwtTestConfiguration::class,
    ],
)
class SecurityConfigurationTest(
    @Autowired private val mockMvc: MockMvc,
) {
    @Test
    fun `protected api accepts a valid bearer access token`() {
        mockMvc.perform(get(PROTECTED_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer valid-token"))
            .andExpect(status().isOk)
            .andExpect(content().string("ok"))
    }

    @Test
    fun `mapped permission authorizes a protected operation`() {
        mockMvc.perform(get(PERMISSION_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer valid-token"))
            .andExpect(status().isOk)
            .andExpect(content().string("permission-ok"))
    }

    @Test
    fun `missing mapped permission denies a protected operation`() {
        mockMvc.perform(get(PERMISSION_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer missing-permission-token"))
            .andExpect(status().isForbidden)
    }

    @Test
    fun `protected api rejects requests without a bearer access token`() {
        mockMvc.perform(get(PROTECTED_PATH))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `protected api rejects a legacy session cookie without a bearer token`() {
        mockMvc.perform(get(PROTECTED_PATH).cookie(Cookie("JSESSIONID", "legacy-session")))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `protected api rejects invalid bearer tokens`() {
        mockMvc.perform(get(PROTECTED_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `protected api rejects expired bearer tokens`() {
        mockMvc.perform(get(PROTECTED_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer expired-token"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `protected api rejects tokens for another audience`() {
        mockMvc.perform(get(PROTECTED_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer wrong-audience-token"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `protected api auto-creates user for unlinked external identities`() {
        mockMvc.perform(get(PROTECTED_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer unlinked-token"))
            .andExpect(status().isOk)
            .andExpect(content().string("ok"))
    }

    @Test
    fun `bootstrap api accepts a valid bearer token without linked external identity`() {
        mockMvc.perform(post(BOOTSTRAP_PATH).header(HttpHeaders.AUTHORIZATION, "Bearer unlinked-token"))
            .andExpect(status().isOk)
            .andExpect(content().string("bootstrap-ok"))
    }

    @TestConfiguration
    class JwtTestConfiguration {
        @Bean
        fun jwtDecoder(): JwtDecoder =
            JwtDecoder { token ->
                when (token) {
                    "valid-token" -> validAccessToken(token)
                    "missing-permission-token" -> validAccessToken(token, "oidc-no-permission")
                    "unlinked-token" -> validAccessToken(token, "unlinked-subject")
                    "expired-token" -> throw BadJwtException("JWT expired")
                    "wrong-audience-token" -> throw BadJwtException("JWT audience mismatch")
                    else -> throw BadJwtException("JWT invalid")
                }
            }

        @Bean
        fun externalIdentityAuthenticationService(): ExternalIdentityAuthenticationService =
            object : ExternalIdentityAuthenticationService {
                override fun resolveAuthorizedUser(
                    issuer: String,
                    subject: String,
                ): AuthenticatedUserTO? {
                    if (issuer != TEST_ISSUER) {
                        return null
                    }

                    return when (subject) {
                        "oidc-subject" ->
                            AuthenticatedUserTO(
                                id = 1,
                                name = "admin",
                                roleNames = setOf("admin"),
                                permissionNames = setOf("user"),
                            )
                        "oidc-no-permission" ->
                            AuthenticatedUserTO(
                                id = 2,
                                name = "viewer",
                                roleNames = setOf("viewer"),
                                permissionNames = emptySet(),
                            )
                        "unlinked-subject" ->
                            AuthenticatedUserTO(
                                id = 3,
                                name = "auto-created-user",
                                roleNames = setOf("viewer"),
                                permissionNames = emptySet(),
                            )
                        else -> null
                    }
                }
            }

        private fun validAccessToken(
            token: String,
            subject: String = "oidc-subject",
        ): Jwt =
            Jwt.withTokenValue(token)
                .header("alg", "RS256")
                .issuer(TEST_ISSUER)
                .subject(subject)
                .audience(listOf(TEST_AUDIENCE))
                .issuedAt(Instant.now().minusSeconds(60))
                .expiresAt(Instant.now().plusSeconds(300))
                .build()
    }
}

@RestController
private class SecurityProbeController {
    @GetMapping("/security-probe")
    fun protectedEndpoint(): String = "ok"

    @PreAuthorize("hasAuthority('user')")
    @GetMapping("/security-probe/user-permission")
    fun permissionProtectedEndpoint(): String = "permission-ok"

    @PostMapping("/me/bootstrap")
    fun bootstrapProbeEndpoint(): String = "bootstrap-ok"
}
