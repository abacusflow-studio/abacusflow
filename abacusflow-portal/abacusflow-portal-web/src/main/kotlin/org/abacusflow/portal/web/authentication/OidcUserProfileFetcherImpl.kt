package org.abacusflow.portal.web.authentication

import com.fasterxml.jackson.annotation.JsonProperty
import org.abacusflow.usecase.user.service.OidcUserProfileFetcher
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import kotlin.jvm.java

@Component
class OidcUserProfileFetcherImpl(
    @Value("\${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private val issuerUri: String,
) : OidcUserProfileFetcher {

    private val log = LoggerFactory.getLogger(javaClass)
    private val restClient = RestClient.create()

    override fun fetchProfile(accessToken: String): OidcUserProfileFetcher.Profile? {
        return try {
            val userinfoUrl = issuerUri.trimEnd('/') + "/userinfo"

            val response =
                restClient.get()
                    .uri(userinfoUrl)
                    .header("Authorization", "Bearer $accessToken")
                    .retrieve()
                    .body(OidcUserInfoResponse::class.java)
                    ?: return null

            OidcUserProfileFetcher.Profile(
                subject = response.sub,
                email = response.email,
                emailVerified = response.emailVerified,
                displayName = response.nickname
                    ?: response.name
                    ?: response.email?.substringBefore("@"),
                pictureUrl = response.picture,
            )

        } catch (e: Exception) {
            log.warn("Failed to fetch OIDC /userinfo: ${e.message}", e)
            null
        }
    }



    data class OidcUserInfoResponse(
        val sub: String,
        val nickname: String? = null,
        val name: String? = null,
        val picture: String? = null,
        val email: String? = null,
        @JsonProperty("email_verified")
        val emailVerified: Boolean? = null,
        @JsonProperty("updated_at")
        val updatedAt: String? = null,
    )
}