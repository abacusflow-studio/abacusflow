## Why

AbacusFlow is moving from a browser-only authentication shape toward Web, mobile, and desktop clients that all need a stable way to call the Spring API. The current codebase mixes an unfinished JWT resource-server direction with commented form-login/session remnants and Web-only username/password token handling, so authentication needs one explicit contract before more client work lands.

## What Changes

- Establish OIDC Authorization Code with PKCE as the client login model for Web, mobile, and desktop applications backed by an external identity provider.
- **BREAKING** Make the Spring portal API authentication contract stateless Bearer access tokens validated by Spring Security Resource Server instead of server session or form-login authentication.
- Configure the portal JWT validation boundary, including issuer and API audience expectations, and expose the Bearer requirement in the OpenAPI contract.
- Define how authenticated external identities map into AbacusFlow business users and authorization data without turning the portal API into an identity provider.
- Retire or stop relying on legacy session/form-login and Web `/api/auth/login` assumptions on the main authentication path.
- Keep a future Web BFF/session-cookie pattern as an optional Web hardening path, not the cross-platform API contract for this change.

## Capabilities

### New Capabilities
- `resource-server-auth`: Stateless Bearer access-token authentication and identity extraction for the Spring portal API.
- `oidc-client-auth`: Cross-platform OIDC login expectations for AbacusFlow Web, mobile, and desktop clients.

### Modified Capabilities
- None.

## Impact

- Spring Security configuration, JWT claim handling, OpenAPI security definitions, and authenticated API error behavior in `abacusflow-portal`.
- Shared client auth abstractions and Web authentication implementation in `abacusflow-apps`; later mobile and desktop auth providers must follow the same OIDC access-token API contract.
- Identity-provider configuration for issuer, audience, application clients, redirect URIs, token lifetime, and refresh-token handling.
- Existing AbacusFlow user, role, and permission code must gain a stable mapping from an OIDC subject to business authorization data.
