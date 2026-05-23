## ADDED Requirements

### Requirement: Clients authenticate through OIDC Authorization Code with PKCE
AbacusFlow Web, mobile, and desktop clients SHALL use an OIDC Authorization Code with PKCE login flow against the selected identity provider before calling protected portal APIs.

#### Scenario: Web client starts login
- **WHEN** an unauthenticated Web user starts login
- **THEN** the Web client initiates the configured OIDC Authorization Code with PKCE flow instead of posting credentials to the portal API

#### Scenario: Native client starts login
- **WHEN** a mobile or desktop user starts login
- **THEN** the native client opens an external authorization user agent and completes the PKCE flow through its registered redirect mechanism

### Requirement: Clients call portal with access tokens
AbacusFlow clients MUST send access tokens as Bearer credentials when calling protected portal APIs and MUST NOT use an OIDC ID token as the API credential.

#### Scenario: Authenticated API request
- **WHEN** a client has a usable OIDC access token for the portal API
- **THEN** it attaches `Authorization: Bearer <access_token>` to the portal request

#### Scenario: ID token available
- **WHEN** a client has an ID token that identifies the signed-in user
- **THEN** it does not use that ID token as the portal API Bearer credential

### Requirement: Client token handling matches platform constraints
Client auth providers SHALL keep platform-specific token storage and refresh behavior behind the shared auth-client abstraction while protecting refresh capability according to the platform threat model.

#### Scenario: Static Web client stores auth state
- **WHEN** the static Web client receives tokens from the OIDC flow
- **THEN** it avoids unnecessary persistent JavaScript-readable token copies while still supplying valid access tokens to the shared API client

#### Scenario: Native client refreshes access
- **WHEN** a mobile or desktop client needs long-lived sign-in state
- **THEN** refresh capability is stored using the platform security mechanism selected for that client

### Requirement: Clients do not depend on portal credential endpoints
The primary cross-platform client authentication path SHALL NOT depend on a portal-owned username/password login or refresh endpoint.

#### Scenario: Portal auth endpoint is absent
- **WHEN** a client needs to sign in or refresh provider-issued access
- **THEN** it uses the identity-provider OIDC flow or provider SDK rather than requiring `/auth/login` or `/auth/refresh` from the business portal
