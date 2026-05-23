# Spec: OIDC Client Authentication

## Overview

Defines how frontend clients (web, mobile, desktop) authenticate users against an external OIDC Identity Provider and obtain JWT access tokens for calling the AbacusFlow API.

## Authentication Flow

Clients use the **Authorization Code Flow with PKCE** (Proof Key for Code Exchange):

1. Client generates a `code_verifier` and derives `code_challenge` (S256)
2. Client redirects user to Auth0 `/authorize` endpoint with:
   - `response_type=code`
   - `client_id=<client-id>`
   - `redirect_uri=<callback-uri>`
   - `scope=openid profile email`
   - `code_challenge=<challenge>`
   - `code_challenge_method=S256`
   - `audience=https://admin.abacusflow.cn`
3. User authenticates at Auth0 (login form, MFA, social login — determined by Auth0 config)
4. Auth0 redirects back with `?code=<authorization_code>`
5. Client exchanges code + `code_verifier` at Auth0 `/oauth/token` endpoint
6. Auth0 returns:
   - `access_token` (JWT, used as Bearer token for API calls)
   - `id_token` (JWT, contains user profile claims)
   - `token_type: "Bearer"`
   - `expires_in: 86400` (24 hours)

## Client Responsibilities

- Store tokens securely (httpOnly cookies for web, secure storage for mobile)
- Attach `Authorization: Bearer <access_token>` header to all API requests
- Handle 401 responses by refreshing or re-authenticating
- Never send tokens to non-API endpoints

## Token Usage

The `access_token` is a JWT with at minimum:
- `iss`: Auth0 issuer URI
- `sub`: Unique user identifier at Auth0
- `aud`: `https://admin.abacusflow.cn`
- `exp`: Expiration timestamp
- `iat`: Issued-at timestamp

The portal does not interpret any other claims — it maps `iss`+`sub` to a local user.

## Platform-Specific Notes

### Web (Next.js)
- Use `next-auth` or `@auth0/auth0-react` for the PKCE flow
- Store tokens in httpOnly cookies or in-memory
- Proxy API calls through Next.js API routes to attach tokens

### Mobile (Expo)
- Use `expo-auth-session` with PKCE
- Store tokens in `expo-secure-store`

### Desktop (Electron)
- Open system browser for Auth0 login
- Use custom protocol handler for redirect URI callback
