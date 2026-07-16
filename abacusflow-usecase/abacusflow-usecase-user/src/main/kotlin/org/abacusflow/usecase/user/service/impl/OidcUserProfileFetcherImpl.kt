package org.abacusflow.usecase.user.service.impl

import com.fasterxml.jackson.annotation.JsonProperty
import org.abacusflow.usecase.user.service.OidcUserProfileFetcher
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import kotlin.jvm.java

@Component
class OidcUserProfileFetcherImpl(
    @Value("\${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private val issuerUri: String,
) : OidcUserProfileFetcher {

    private val log = LoggerFactory.getLogger(javaClass)
    private val httpClient = HttpClient.newHttpClient()

    override fun fetchProfile(accessToken: String): OidcUserProfileFetcher.Profile? {
        return try {
            val userinfoUrl = issuerUri.trimEnd('/') + "/userinfo"

            val request = HttpRequest.newBuilder()
                .uri(URI.create(userinfoUrl))
                .header("Authorization", "Bearer $accessToken")
                .GET()
                .build()

            val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString())

            if (response.statusCode() != 200) {
                log.warn("OIDC /userinfo returned status ${response.statusCode()}")
                return null
            }

            val body = response.body()
            parseUserInfo(body)
        } catch (e: Exception) {
            log.warn("Failed to fetch OIDC /userinfo: ${e.message}", e)
            null
        }
    }

    private fun parseUserInfo(json: String): OidcUserProfileFetcher.Profile? {
        return try {
            // Minimal JSON parsing without pulling in Jackson ObjectMapper —
            // use regex for the few fields we need. Alternatively, use Jackson
            // which is already on the classpath via spring-boot-starter-json.
            val mapper = com.fasterxml.jackson.databind.ObjectMapper()
            val node = mapper.readTree(json)

            OidcUserProfileFetcher.Profile(
                subject = node.get("sub")?.asText() ?: return null,
                email = node.get("email")?.asText(),
                emailVerified = node.get("email_verified")?.asBoolean(),
                displayName = node.get("nickname")?.asText()
                    ?: node.get("name")?.asText()
                    ?: node.get("email")?.asText()?.substringBefore("@"),
                pictureUrl = node.get("picture")?.asText(),
            )
        } catch (e: Exception) {
            log.warn("Failed to parse OIDC /userinfo response: ${e.message}")
            null
        }
    }
}
