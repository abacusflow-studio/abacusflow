package org.abacusflow.portal.web.authentication

import org.springframework.security.core.authority.SimpleGrantedAuthority

object TenantAuthorityBuilder {
    fun buildAuthorities(
        roleNames: Set<String>,
        permissionNames: Set<String>,
    ): Set<SimpleGrantedAuthority> =
        // Role authorities with ROLE_ prefix (for hasRole())
        roleNames.map { SimpleGrantedAuthority("ROLE_$it") }.toSet() +
            // Permission authorities as-is (for hasAuthority('product:read'))
            permissionNames.map { SimpleGrantedAuthority(it) }
}
