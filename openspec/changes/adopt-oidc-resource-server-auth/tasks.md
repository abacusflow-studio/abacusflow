## 1. Portal Resource Server Contract

- [x] 1.1 Make the portal Spring Security chain explicitly stateless for protected APIs and keep JWT Resource Server as the authentication path.
- [x] 1.2 Configure and verify JWT issuer and portal API audience validation for environment-driven OIDC providers.
- [x] 1.3 Publish the Bearer JWT security scheme and protected-operation requirement in the portal OpenAPI contract.
- [x] 1.4 Add focused portal security tests for valid Bearer requests plus missing, invalid, expired, or wrong-audience token failures.

## 2. Business Identity And Authorization

- [x] 2.1 Add the minimum persistent external identity mapping needed to link an OIDC issuer and subject to an AbacusFlow user.
- [x] 2.2 Resolve authenticated OIDC principals through the AbacusFlow user mapping and deny unlinked or disabled business users.
- [x] 2.3 Connect mapped user roles and permissions to the application authorization path with focused coverage for allowed and denied operations.

## 3. Web OIDC Client Path

- [x] 3.1 Replace the Web `/api/auth/login` main path with the selected OIDC Authorization Code with PKCE client flow and callback handling.
- [x] 3.2 Align Web auth state and routing with static export constraints by removing middleware and JavaScript-readable cookie assumptions that exist only for server-side session checks.
- [ ] 3.3 Keep the shared API client on Bearer access tokens and add Web verification for authenticated and re-login behavior.

## 4. Native Client Alignment

- [ ] 4.1 Replace the mobile demo auth provider with a native OIDC PKCE integration boundary that uses an external authorization user agent and platform secure storage choices.
- [x] 4.2 Capture the desktop OIDC client requirements and shared auth-provider contract needed for the future desktop implementation.

## 5. Migration Cleanup

- [x] 5.1 Remove or archive obsolete portal form-login, session, and unfinished custom JWT-filter remnants after the Resource Server path is covered.
- [x] 5.2 Document required identity-provider registrations, issuer/audience values, redirect URIs, and local verification steps for the new authentication path.
