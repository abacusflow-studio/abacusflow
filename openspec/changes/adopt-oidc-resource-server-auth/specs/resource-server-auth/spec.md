## ADDED Requirements

### Requirement: Portal API uses Bearer access-token authentication
The portal API SHALL authenticate protected requests with an OAuth2 Bearer access token supplied in the `Authorization` header and SHALL NOT require a browser server session or form-login flow for the cross-platform API contract.

#### Scenario: Valid protected request
- **WHEN** a client calls a protected portal API endpoint with a valid Bearer access token
- **THEN** the request is authenticated through the resource-server security chain

#### Scenario: Session cookie without Bearer token
- **WHEN** a client calls a protected portal API endpoint with only a legacy browser session or auth cookie and no Bearer access token
- **THEN** the portal rejects the request as unauthenticated

### Requirement: Portal validates access tokens for its resource boundary
The portal resource server MUST validate the configured issuer, signature, token lifetime, and portal API audience before accepting a JWT access token.

#### Scenario: Token for another audience
- **WHEN** a JWT is otherwise valid but is not issued for the configured portal API audience
- **THEN** the portal rejects the token

#### Scenario: Expired or invalid token
- **WHEN** a protected request carries an expired, malformed, or invalidly signed access token
- **THEN** the portal rejects the request without entering the business handler

### Requirement: API authentication failures stay API-shaped
The portal SHALL return authentication and authorization failures as API responses rather than redirecting protected API requests to a login page.

#### Scenario: Missing access token
- **WHEN** a client calls a protected API endpoint without a valid access token
- **THEN** the response reports an unauthenticated failure suitable for API clients

#### Scenario: Insufficient authority
- **WHEN** an authenticated principal lacks authority for a protected operation
- **THEN** the response reports an authorization failure suitable for API clients

### Requirement: Authenticated identities map to AbacusFlow authorization data
The portal SHALL expose a stable external OIDC identity to the application authorization path and MUST resolve business access from AbacusFlow user, role, and permission data rather than relying only on a browser session.

#### Scenario: Linked external identity
- **WHEN** a valid access token identifies an external subject linked to an enabled AbacusFlow user
- **THEN** application authorization can evaluate that user's AbacusFlow roles and permissions

#### Scenario: Unlinked or disabled identity
- **WHEN** a valid external identity has no allowed AbacusFlow user mapping or maps to a disabled business user
- **THEN** the portal denies business API access according to the configured authorization policy

### Requirement: OpenAPI declares Bearer protection
The portal OpenAPI contract SHALL declare the Bearer JWT security scheme used by protected API operations.

#### Scenario: Client inspects the API contract
- **WHEN** a generated client or developer reads the OpenAPI document
- **THEN** the Bearer authentication requirement is visible in the API security definitions
