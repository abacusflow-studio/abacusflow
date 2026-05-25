package org.abacusflow.portal.web.authentication

import org.abacusflow.usecase.user.AuthenticatedUserTO
import org.abacusflow.usecase.user.service.ExternalIdentityAuthenticationService
import org.springframework.core.convert.converter.Converter
import org.springframework.security.authentication.AbstractAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.stereotype.Component

@Component
class AbacusFlowJwtAuthenticationConverter(
    private val externalIdentityAuthenticationService: ExternalIdentityAuthenticationService,
) : Converter<Jwt, AbstractAuthenticationToken> {
    override fun convert(jwt: Jwt): AbstractAuthenticationToken {
        val issuer = jwt.issuer?.toString() ?: throw invalidExternalIdentity()
        val subject = jwt.subject.takeUnless { it.isNullOrBlank() } ?: throw invalidExternalIdentity()
        val user =
            externalIdentityAuthenticationService.resolveAuthorizedUser(
                issuer = issuer,
                subject = subject,
            )
                ?: throw userNotAuthorized()

        return JwtAuthenticationToken(
            jwt,
            user.toAuthorities(),
            user.name,
        )
    }

    private fun AuthenticatedUserTO.toAuthorities(): Set<SimpleGrantedAuthority> =
        // Role authorities with ROLE_ prefix (for hasRole())
        roleNames.map { SimpleGrantedAuthority("ROLE_$it") }.toSet() +
            // Permission authorities as-is (for hasAuthority('product:read'))
            permissionNames.map { SimpleGrantedAuthority(it) }

    private fun invalidExternalIdentity(): OAuth2AuthenticationException =
        OAuth2AuthenticationException(
            OAuth2Error(
                "invalid_token",
                "External identity is not authorized for AbacusFlow.",
                null,
            ),
        )

    private fun userNotAuthorized(): OAuth2AuthenticationException =
        OAuth2AuthenticationException(
            OAuth2Error(
                "access_denied",
                "User is not enabled or has not been approved yet.",
                null,
            ),
        )
}
