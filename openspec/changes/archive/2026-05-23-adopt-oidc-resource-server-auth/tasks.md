# Tasks: Adopt OIDC Resource Server Authentication

## Domain Model

- [x] Create `ExternalIdentity` JPA entity mapped to `user_external_identity` table
- [x] Create `ExternalIdentityRepository` with `findByIssuerAndSubject` query

## Service Layer

- [x] Create `AuthenticatedUserTO` data class (id, name, roleNames, permissionNames)
- [x] Create `ExternalIdentityAuthenticationService` interface
- [x] Implement `ExternalIdentityAuthenticationServiceImpl` — lookup identity, validate user status, return TO

## Security Infrastructure

- [x] Create `AbacusFlowJwtAuthenticationConverter` — extract `iss`+`sub`, resolve user, build authorities
- [x] Rewrite `SecurityConfiguration` — stateless, disable form-login/http-basic, configure `oauth2ResourceServer` with custom converter
- [x] Add `@EnableMethodSecurity` for `@PreAuthorize` support

## Database

- [x] Add `user_external_identity` DDL to `script/initdb/01-stru.sql`

## Configuration

- [x] Add `audiences` property to `application-web.yml` with env var override
- [x] Parameterize `issuer-uri` with env var `ABACUSFLOW_OIDC_ISSUER_URI`

## Testing

- [x] Create `SecurityConfigurationTest` with 9 integration test cases:
  - [x] Valid bearer token accepted
  - [x] `@PreAuthorize` with matching permission → 200
  - [x] Missing permission → 403
  - [x] No token → 401
  - [x] Legacy JSESSIONID → 401
  - [x] Invalid token → 401
  - [x] Expired token → 401
  - [x] Wrong audience → 401
  - [x] Unlinked identity → 401

## Cleanup

- [x] Remove commented-out legacy auth code (form-login handlers, UserDetailsService, LoginController, JWT filter)
- [x] Remove unused `spring-boot-starter-oauth2-client` dependency if present

## Documentation

- [x] Create `docs/authentication-oidc.md` describing the architecture
