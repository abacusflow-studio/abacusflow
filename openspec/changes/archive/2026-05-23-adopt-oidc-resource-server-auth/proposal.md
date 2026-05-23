# Proposal: Adopt OIDC Resource Server Authentication

## Problem

AbacusFlow portal currently uses legacy form-login authentication with session-based auth. This approach:
- Ties authentication to the server-side session, making horizontal scaling harder
- Requires maintaining custom login/logout controllers and JWT cookie handling
- Cannot integrate with external identity providers (IdP) like Auth0, Keycloak, or corporate SSO

## Solution

Adopt OAuth2 Resource Server authentication using JWT tokens issued by an external OIDC-compliant Identity Provider (Auth0). The portal acts purely as a **resource server** (not an authorization server). Clients authenticate against the IdP using Authorization Code + PKCE flow, then present JWT bearer tokens to the portal API.

### Key Design Decisions

1. **Resource Server Only**: The portal validates JWTs and maps `iss` + `sub` claims to local business users. It does not issue tokens.
2. **External Identity Linking**: A `user_external_identity` table maps IdP identities (`issuer`, `subject`) to local `user_account` records.
3. **Local Authorization**: Roles and permissions remain in the local database. The portal extracts role/permission names from the local user and converts them to Spring Security authorities.
4. **Stateless Sessions**: `SessionCreationPolicy.STATELESS` — no server-side session, no cookies.

## Scope

### In Scope
- `ExternalIdentity` domain entity and repository
- `ExternalIdentityAuthenticationService` for resolving local user from JWT claims
- `AbacusFlowJwtAuthenticationConverter` for Spring Security integration
- Stateless `SecurityConfiguration` with `oauth2ResourceServer { jwt {} }`
- `user_external_identity` DDL migration
- Integration test suite for security configuration
- Auth0 audience configuration

### Non-Goals
- Building an authorization server
- Implementing token refresh or token revocation on the portal side
- Supporting multiple simultaneous IdPs (single issuer for now)
- Migrating existing user passwords or sessions
