package org.abacusflow.portal.web

import org.abacusflow.portal.web.authentication.AbacusFlowJwtAuthenticationConverter
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableMethodSecurity
class SecurityConfiguration {
    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        appJwtAuthenticationConverter: AbacusFlowJwtAuthenticationConverter,
    ): SecurityFilterChain {
        http {
            csrf { disable() }
            cors { }
            httpBasic { disable() }
            formLogin { disable() }
            logout { disable() }
            sessionManagement { sessionCreationPolicy = SessionCreationPolicy.STATELESS }
            authorizeHttpRequests {
                authorize(HttpMethod.OPTIONS, "/**", permitAll)
                authorize("/static/**", permitAll)
                authorize("/openapi.yaml", permitAll)
                authorize("/login", permitAll)
                authorize("/oauth2/**", permitAll)
                authorize("/error", permitAll)
                authorize(anyRequest, authenticated)
            }
            oauth2ResourceServer {
                jwt { jwtAuthenticationConverter = appJwtAuthenticationConverter }
            }
        }
        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun corsConfigurationSource(
        @Value("\${abacusflow.cors.allowed-origin-patterns:}") allowedOriginPatterns: String,
    ): CorsConfigurationSource {
        val origins =
            allowedOriginPatterns
                .split(",")
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .ifEmpty { listOf("http://localhost:*") }

        val configuration =
            CorsConfiguration().apply {
                this.allowedOriginPatterns = origins
                allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                allowedHeaders = listOf(CorsConfiguration.ALL)
                exposedHeaders = listOf(HttpHeaders.LOCATION, HttpHeaders.CONTENT_DISPOSITION)
                allowCredentials = false
                maxAge = 3600
            }

        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", configuration)
        }
    }

//    @Bean
//    fun appJwtAuthenticationConverter(
//        externalIdentityAuthenticationService: ExternalIdentityAuthenticationService,
//    ): AbacusFlowJwtAuthenticationConverter {
//        return AbacusFlowJwtAuthenticationConverter(externalIdentityAuthenticationService)
//    }
}
