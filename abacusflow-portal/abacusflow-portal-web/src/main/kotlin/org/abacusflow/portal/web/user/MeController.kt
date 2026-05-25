package org.abacusflow.portal.web.user

import org.abacusflow.portal.web.api.MeApi
import org.abacusflow.portal.web.model.BootstrapResultVO
import org.abacusflow.portal.web.model.CurrentUserVO
import org.abacusflow.usecase.user.service.BootstrapService
import org.abacusflow.usecase.user.service.CurrentUserService
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.client.RestClient

@RestController
class MeController(
    private val bootstrapService: BootstrapService,
    private val currentUserService: CurrentUserService,
    @Value("\${spring.security.oauth2.resourceserver.jwt.issuer-uri}") private val issuerUri: String,
) : MeApi {
    private val restClient = RestClient.create()

    override fun bootstrap(): ResponseEntity<BootstrapResultVO> {
        val jwt = currentJwt()
        val issuer = jwt.issuer?.toString() ?: return ResponseEntity.badRequest().build()
        val subject = jwt.subject ?: return ResponseEntity.badRequest().build()

        val userInfo = fetchUserInfo(jwt.tokenValue)
        val email = userInfo?.get("email") as? String
        val emailVerified = userInfo?.get("email_verified") as? Boolean
        val displayName = (userInfo?.get("name") as? String) ?: (userInfo?.get("nickname") as? String)
        val pictureUrl = userInfo?.get("picture") as? String

        val result =
            bootstrapService.bootstrap(
                issuer = issuer,
                subject = subject,
                email = email,
                emailVerified = emailVerified,
                displayName = displayName,
                pictureUrl = pictureUrl,
            )

        return ResponseEntity.ok(result.toVO())
    }

    override fun getCurrentUser(): ResponseEntity<CurrentUserVO> {
        val jwt = currentJwt()
        val issuer = jwt.issuer?.toString() ?: return ResponseEntity.badRequest().build()
        val subject = jwt.subject ?: return ResponseEntity.badRequest().build()

        val currentUser =
            currentUserService.getCurrentUser(issuer, subject)
                ?: return ResponseEntity.status(403).build()

        return ResponseEntity.ok(currentUser.toVO())
    }

    private fun currentJwt(): Jwt {
        val auth = org.springframework.security.core.context.SecurityContextHolder.getContext().authentication
        return auth.principal as Jwt
    }

    private fun fetchUserInfo(accessToken: String): Map<String, Any?>? {
        return try {
            val userinfoUrl = issuerUri.trimEnd('/') + "/userinfo"
            val response =
                restClient.get()
                    .uri(userinfoUrl)
                    .header("Authorization", "Bearer $accessToken")
                    .retrieve()
                    .onStatus({ it == HttpStatus.UNAUTHORIZED || it == HttpStatus.FORBIDDEN }) { _, _ ->
                        logger.warn("Auth0 userinfo returned unauthorized")
                    }
                    .toEntity(Map::class.java)

            @Suppress("UNCHECKED_CAST")
            response.body as? Map<String, Any?>
        } catch (e: Exception) {
            logger.warn("Failed to fetch userinfo: ${e.message}", e)
            null
        }
    }

    companion object {
        private val logger = LoggerFactory.getLogger(MeController::class.java)
    }
}
