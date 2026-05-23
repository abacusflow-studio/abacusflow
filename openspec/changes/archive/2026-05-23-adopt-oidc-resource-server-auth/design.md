# Design: OIDC Resource Server Authentication

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Client     │────▶│    Auth0      │     │  AbacusFlow API  │
│ (Web/Mobile) │     │   (IdP)       │     │ (Resource Server)│
│              │◀────│              │     │                  │
│              │──────Bearer Token──────────▶│                  │
└─────────────┘     └──────────────┘     └──────────────────┘
```

**Flow:**
1. Client authenticates with Auth0 using Authorization Code + PKCE
2. Auth0 issues a JWT access token
3. Client sends requests with `Authorization: Bearer <token>`
4. Portal validates JWT signature and claims using Auth0's JWKS endpoint
5. Portal extracts `iss` + `sub` from JWT, maps to local user via `user_external_identity`
6. Portal loads local user's roles/permissions and creates Spring Security `Authentication`

## Components

### 1. Domain Model — `ExternalIdentity`

**Location:** `abacusflow-user` core domain module

```
ExternalIdentity (JPA Entity)
├── id: Long (PK)
├── issuer: String (IdP issuer URI)
├── subject: String (IdP user identifier)
├── userId: Long (FK → user_account.id)
└── UNIQUE(issuer, subject)
```

This is a **value-style entity** — its identity is the natural key `(issuer, subject)`. The surrogate `id` exists only for JPA convenience.

### 2. Repository — `ExternalIdentityRepository`

**Location:** `abacusflow-user` infra module

```kotlin
interface ExternalIdentityRepository : JpaRepository<ExternalIdentity, Long> {
    fun findByIssuerAndSubject(issuer: String, subject: String): ExternalIdentity?
}
```

### 3. Authentication Service

**Location:** `abacusflow-usecase-user`

```
ExternalIdentityAuthenticationService (interface)
└── resolveAuthorizedUser(issuer: String, subject: String): AuthenticatedUserTO?

ExternalIdentityAuthenticationServiceImpl
├── Injects: ExternalIdentityRepository, UserRepository
├── Looks up ExternalIdentity by (issuer, subject)
├── Loads UserAccount, checks enabled + not locked
└── Returns AuthenticatedUserTO(id, name, roleNames, permissionNames)
```

**`AuthenticatedUserTO`** is a transfer object carrying the resolved user's identity and authorization data.

### 4. JWT Authentication Converter

**Location:** `abacusflow-portal-web`

```
AbacusFlowJwtAuthenticationConverter : Converter<Jwt, AbstractAuthenticationToken>
├── Extracts iss, sub from validated JWT
├── Calls ExternalIdentityAuthenticationService.resolveAuthorizedUser()
├── Builds JwtAuthenticationToken with authorities:
│   ├── ROLE_<roleName> for each role
│   └── PERMISSION_<permissionName> for each permission
└── Throws OAuth2AuthenticationException(OAuth2Error("invalid_token")) if not linked
```

### 5. Security Configuration

```kotlin
@Configuration
@EnableMethodSecurity
class SecurityConfiguration(
    private val jwtAuthenticationConverter: AbacusFlowJwtAuthenticationConverter
) {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
            .logout { it.disable() }
            .sessionManagement { it.sessionCreationPolicy = STATELESS }
            .authorizeHttpRequests {
                it.requestMatchers("/static/**", "/login", "/oauth2/**", "/error").permitAll()
                  .anyRequest().authenticated()
            }
            .oauth2ResourceServer {
                it.jwt { jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter) }
            }
        return http.build()
    }
}
```

### 6. Database Schema

```sql
CREATE TABLE user_external_identity (
    id          BIGSERIAL PRIMARY KEY,
    issuer      VARCHAR(512) NOT NULL,
    subject     VARCHAR(512) NOT NULL,
    user_id     BIGINT NOT NULL REFERENCES user_account(id),
    UNIQUE(issuer, subject)
);
```

### 7. Configuration

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${ABACUSFLOW_OIDC_ISSUER_URI:https://dev-st5cs3qsjm2174ua.us.auth0.com/}
          audiences:
            - ${ABACUSFLOW_OIDC_AUDIENCE:https://admin.abacusflow.cn}
```

## Error Handling

| Scenario | HTTP Status | Detail |
|---|---|---|
| No token | 401 | Missing Bearer token |
| Invalid signature | 401 | JWT validation failed |
| Expired token | 401 | Token expired |
| Wrong audience | 401 | Audience mismatch |
| Unlinked identity | 401 | `iss`+`sub` not found in `user_external_identity` |
| User disabled/locked | 401 | Local user account inactive |
| Missing permission | 403 | Valid auth but insufficient authority |

## Testing Strategy

Integration tests with `@WebMvcTest` and mock JWT:
- Valid token → 200 with correct authorities
- `@PreAuthorize` with matching permission → 200
- `@PreAuthorize` with missing permission → 403
- No token → 401
- Invalid/expired/wrong-audience tokens → 401
- Unlinked identity → 401
- Legacy JSESSIONID cookie → 401 (stateless, no session)
