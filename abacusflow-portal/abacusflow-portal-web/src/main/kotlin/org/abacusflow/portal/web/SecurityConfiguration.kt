package org.abacusflow.portal.web

import org.abacusflow.portal.web.authentication.AbacusFlowJwtAuthenticationConverter
import org.abacusflow.usecase.user.service.ExternalIdentityAuthenticationService
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableMethodSecurity
class SecurityConfiguration {
    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        jwtAuthenticationConverter: AbacusFlowJwtAuthenticationConverter,
    ): SecurityFilterChain {
        http {
            csrf { disable() }
            httpBasic { disable() }
            formLogin { disable() }
            logout { disable() }

            sessionManagement {
                sessionCreationPolicy = SessionCreationPolicy.STATELESS
            }

            authorizeHttpRequests {
                authorize("/static/**", permitAll)
                authorize("/openapi.yaml", permitAll)
                authorize("/login", permitAll)
                authorize("/oauth2/**", permitAll)
                authorize("/error", permitAll)
                authorize(anyRequest, authenticated)
            }

            oauth2ResourceServer {
                jwt {
                    this.jwtAuthenticationConverter = jwtAuthenticationConverter
                }
            }
        }
        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()
}
