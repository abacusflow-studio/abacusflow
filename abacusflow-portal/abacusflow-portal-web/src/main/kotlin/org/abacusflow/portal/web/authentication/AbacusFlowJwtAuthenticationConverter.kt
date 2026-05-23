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
                email = jwt.getClaimAsString("email"),
                displayName = jwt.getClaimAsString("name") ?: jwt.getClaimAsString("nickname"),
            )
                ?: throw invalidExternalIdentity()

        return JwtAuthenticationToken(
            jwt,
            user.toAuthorities(),
            user.name,
        )
    }

    private fun AuthenticatedUserTO.toAuthorities(): Set<SimpleGrantedAuthority> =
        roleNames.map { SimpleGrantedAuthority("ROLE_$it") }.toSet() +
            permissionNames.map { SimpleGrantedAuthority("PERMISSION_$it") }

    private fun invalidExternalIdentity(): OAuth2AuthenticationException =
        OAuth2AuthenticationException(
            OAuth2Error(
                "invalid_token",
                "External identity is not authorized for AbacusFlow.",
                null,
            ),
        )
}
