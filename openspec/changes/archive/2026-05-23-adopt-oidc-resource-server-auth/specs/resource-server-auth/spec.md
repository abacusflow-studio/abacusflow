# Spec: Resource Server Authentication

## Overview

Defines how the AbacusFlow portal (Spring Boot backend) validates JWT bearer tokens and maps external identities to local business users for authorization.

## JWT Validation

The portal validates incoming JWTs using Spring Security's OAuth2 Resource Server:

1. Extract `Authorization: Bearer <token>` header
2. Validate JWT signature against Auth0's JWKS endpoint (auto-discovered via `issuer-uri`)
3. Validate standard claims: `iss`, `aud`, `exp`, `iat`
4. On success, pass the `Jwt` object to `AbacusFlowJwtAuthenticationConverter`

## Identity Resolution

`AbacusFlowJwtAuthenticationConverter` maps JWT claims to a local user:

1. Extract `iss` (issuer) and `sub` (subject) from the validated JWT
2. Call `ExternalIdentityAuthenticationService.resolveAuthorizedUser(iss, sub)`
3. Service queries `user_external_identity` table for matching `(issuer, subject)` pair
4. If found, load the linked `UserAccount` and verify:
   - `enabled == true`
   - `accountLocked == false`
5. Return `AuthenticatedUserTO` with user's id, name, role names, and permission names

## Authority Mapping

The converter builds Spring Security authorities from the local user's roles and permissions:

```
Authorities = { "ROLE_admin", "ROLE_user", "PERMISSION_product:read", "PERMISSION_inventory:write", ... }
```

- Each role name → `ROLE_<roleName>`
- Each permission name → `PERMISSION_<permissionName>`

These authorities are used by `@PreAuthorize` annotations and `authorizeHttpRequests` rules.

## Error Responses

| Condition | Status | Body |
|---|---|---|
| No `Authorization` header | 401 | `{"error": "unauthorized"}` |
| Invalid JWT signature | 401 | `{"error": "unauthorized"}` |
| JWT expired | 401 | `{"error": "unauthorized"}` |
| Audience mismatch | 401 | `{"error": "unauthorized"}` |
| `iss`+`sub` not in `user_external_identity` | 401 | `{"error": "unauthorized"}` |
| Local user disabled/locked | 401 | `{"error": "unauthorized"}` |
| Valid auth, insufficient permission | 403 | `{"error": "forbidden"}` |

## Stateless Session Policy

- `SessionCreationPolicy.STATELESS` — no HTTP session created
- No cookies used for authentication (JSESSIONID rejected)
- Every request must carry a valid Bearer token

## Configuration

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

## Database Schema

```sql
CREATE TABLE user_external_identity (
    id          BIGSERIAL PRIMARY KEY,
    issuer      VARCHAR(512) NOT NULL,
    subject     VARCHAR(512) NOT NULL,
    user_id     BIGINT NOT NULL REFERENCES user_account(id),
    UNIQUE(issuer, subject)
);

CREATE INDEX idx_external_identity_lookup ON user_external_identity(issuer, subject);
```

## Testing

Integration tests (`SecurityConfigurationTest`) cover:
- Valid bearer token → 200
- `@PreAuthorize` with matching authority → 200
- `@PreAuthorize` with missing authority → 403
- Missing token → 401
- Legacy JSESSIONID cookie → 401
- Invalid token → 401
- Expired token → 401
- Wrong audience → 401
- Unlinked external identity → 401
