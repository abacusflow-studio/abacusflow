## Context

AbacusFlow now has a Spring portal API plus shared Web and mobile client code, with desktop clients expected to use the same business API contract. The portal security configuration already includes Spring Security OAuth2 Resource Server JWT support and an issuer configuration, while older form-login, user-details, and cookie/session handlers remain commented out or unfinished. The shared API client already knows how to attach `Authorization: Bearer ...`, but the Web auth implementation is in transition and currently mixes redirect-based Auth0 scaffolding with a local `/api/auth/login` assumption and JavaScript-readable token storage.

The authentication boundary has to work for public clients that cannot safely keep a client secret, static Web deployment constraints, and AbacusFlow's existing business user, role, and permission model.

## Goals / Non-Goals

**Goals:**
- Define one API authentication contract for Web, mobile, and desktop clients: a valid OIDC access token in the Bearer authorization header.
- Keep portal authentication stateless and delegated to Spring Security Resource Server JWT validation.
- Keep identity-provider login, PKCE, redirect URI, token refresh, and MFA concerns outside the business portal API.
- Make the OpenAPI contract and error behavior reflect protected Bearer-token APIs.
- Preserve AbacusFlow ownership of business authorization data by mapping authenticated external identities to local users and permissions.
- Give the current static Web app a direct OIDC path that does not require a Next server-side auth endpoint.

**Non-Goals:**
- Build a new AbacusFlow authorization server or custom username/password token issuer.
- Implement a Web BFF or convert the production Web app away from static export in this change.
- Fully model provisioning, invitation, password reset, MFA, or identity-provider administration.
- Collapse provider-specific client configuration for Web, mobile, and desktop into one OAuth client registration.

## Decisions

### Delegate login and token issuance to an OIDC provider

Auth0, Keycloak, Supabase Auth, or another OIDC-compliant provider shall authenticate users and issue tokens. Portal shall not grow `/auth/login`, refresh-token issuance, credential attack protection, password reset, or MFA flows as part of the business API.

The main alternative is a first-party token issuer backed by `UserAuthenticationService`. That would require refresh-token storage and rotation, revocation, brute-force defenses, password lifecycle flows, audit trails, and cross-platform OAuth-equivalent redirect handling before it is safe enough to replace an identity provider.

### Make portal a JWT resource server

Portal shall require Bearer access tokens for protected API requests and use Spring Security Resource Server rather than a custom JWT servlet filter. JWT validation shall be configured with the provider issuer and the API audience so tokens issued for another resource are rejected.

The portal security chain shall be stateless for API authentication. Legacy form-login and session authentication are no longer the main portal path. A future Web BFF can use an HttpOnly browser session at the Web edge while still forwarding Bearer access tokens to the portal.

### Treat the access token as the API credential

Clients shall send access tokens to the portal and shall not use ID tokens as API credentials. The resource server shall return API-style 401/403 responses instead of browser redirects when Bearer authentication or authorization fails.

This keeps the API contract independent of whether a caller is a static Web SPA, a native app, a desktop app, a CLI later, or a BFF proxy.

### Keep business authorization in AbacusFlow

The OIDC principal identity shall be keyed from a stable external identity tuple such as issuer plus subject. AbacusFlow shall own business user enablement, tenant or warehouse scope when introduced, roles, and permissions.

The initial implementation uses just-in-time provisioning for first-seen OIDC identities: a valid `issuer + subject` that has no local mapping creates a disabled AbacusFlow business user and `user_external_identity` row for administrator review. Provider claims may seed review data such as display name or email, but business permissions must not become dependent on a provider-specific role claim shape by accident.

### Use platform-specific OIDC public clients

Web, mobile, and desktop applications shall all use Authorization Code with PKCE while keeping platform-specific client registrations and redirect URIs. Native clients shall use the system browser or another external user agent instead of collecting credentials in an embedded WebView.

For the current static Web deployment, direct browser OIDC integration is the first delivery path. Because access tokens exist in the browser in that path, the Web implementation shall avoid unnecessary persistent JavaScript-readable token copies and shall keep a future BFF option visible for higher-sensitivity deployments.

## Risks / Trade-offs

- [Identity-provider drift] Issuer, audience, redirect URIs, claim shape, and refresh-token policy can diverge across environments -> centralize provider configuration per environment and add validation/test coverage around portal JWT expectations.
- [Web token exposure] Direct SPA token handling exposes tokens to browser compromise more than a BFF -> prefer short-lived access tokens, PKCE, provider refresh-token protections, CSP/XSS hardening, and revisit a BFF when the Web threat model warrants it.
- [Authorization split] Provider identity and AbacusFlow business authorization can fall out of sync -> use an explicit external identity mapping and decide provisioning/disablement policy before relying on production access.
- [Migration breakage] Current Web drafts assume `/api/auth/login` and local token persistence -> land the OIDC client adapter before removing fallback paths that local verification still needs.
- [Static export constraints] A static Next build cannot host a server auth callback or proxy in production -> use provider-supported browser redirects and an external API routing/CORS plan until a BFF exists.

## Migration Plan

1. Define provider environment values and API audience for local and deployed environments.
2. Tighten portal security as a stateless JWT resource server and publish the Bearer security requirement in OpenAPI.
3. Add a minimal external-identity mapping and authorization extraction path for authenticated portal requests.
4. Replace the Web `/api/auth/login` main path with the OIDC PKCE client adapter while preserving the shared API client's Bearer header contract.
5. Implement mobile and desktop auth providers against the same OIDC access-token contract with native redirect and secure-storage choices.
6. Remove or archive legacy form-login/session remnants once the OIDC path is verified end to end.

Rollback is limited once clients depend on Bearer-only portal APIs. Before production rollout, keep the previous deployment available or gate the new security configuration per environment while the provider and client registrations are verified.

## Open Questions

- Which OIDC provider is the first deployment target: hosted Auth0, self-hosted Keycloak, Supabase Auth, or another provider?
- Should pending first-login users surface in the existing user list or get a dedicated approval queue?
- Which business permissions must be enforced in the first protected endpoint pass beyond the current authenticated-only boundary?
- Does the first Web production deployment accept direct browser token handling, or should the Web app stop static export and introduce a BFF before production?
