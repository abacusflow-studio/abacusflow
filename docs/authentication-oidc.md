# OIDC Authentication

AbacusFlow portal APIs use one cross-platform authentication contract:

```text
Web / Mobile / Desktop
        -> OIDC provider login with Authorization Code + PKCE
        -> portal request with Authorization: Bearer <access_token>
        -> Spring Security Resource Server validates the access token
        -> AbacusFlow maps issuer + subject to a business user
```

The portal is not an authorization server. It must not grow a primary
username/password login endpoint, provider refresh-token endpoint, or browser
session contract for these clients.

## Portal Configuration

The portal JWT validator reads these environment values:

| Variable | Purpose | Development fallback |
| --- | --- | --- |
| `ABACUSFLOW_OIDC_ISSUER_URI` | OIDC issuer used to resolve signing keys and validate `iss` | `https://dev-st5cs3qsjm2174ua.us.auth0.com/` |
| `ABACUSFLOW_OIDC_AUDIENCE` | API audience required in the access token | `https://admin.abacusflow.cn` |

Each protected API operation accepts Bearer access tokens. ID tokens identify a
client session and are not portal API credentials.

Spring Security extracts a validated JWT principal, then AbacusFlow resolves
the external identity through `user_external_identity`:

| Column | Meaning |
| --- | --- |
| `issuer` | Exact token issuer |
| `subject` | Stable OIDC `sub` claim |
| `user_id` | Local `user_account` record |

The local user must still be enabled and unlocked. Local roles and permissions
remain the source of business authorization after identity mapping.

## Provider Registrations

Create a dedicated portal API registration in the selected OIDC provider with
the same audience configured in the portal.

Register each app as a public client with its own redirect policy:

| Client | Redirect pattern | Notes |
| --- | --- | --- |
| Web SPA | `http://localhost:3000/callback` and the deployed Web `/callback` URL | The current Web app is statically exported and uses the Auth0 SPA SDK PKCE redirect flow. |
| Mobile | An approved app link or custom scheme callback such as `abacusflow://oauth/callback` | Open the system browser or platform authorization agent, not an embedded credential WebView. |
| Desktop | A loopback callback or owned custom scheme callback | Use the system browser and keep refresh capability in an OS-backed credential store. |

Register Web logout return URLs for `/login` in the environments where logout
is enabled. Do not share a confidential server client secret with SPA, mobile,
or desktop code.

## Web Configuration

The static Web client reads:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | Auth0 tenant domain |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | Web public client ID |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | Portal API audience |
| `NEXT_PUBLIC_API_BASE_URL` | Portal API base URL or local development proxy path |

The Web Auth0 provider keeps the access-token path behind the shared
`AuthClient`. The shared API client obtains an access token from that client and
sets the Bearer header. Static export must not depend on Next middleware,
JavaScript-readable auth cookies, or a Next `/api/auth/login` endpoint.

## Native Boundary

Mobile and desktop auth providers must implement the shared `AuthClient`
contract while keeping native concerns behind their platform adapter:

1. Start Authorization Code with PKCE in an external authorization agent.
2. Receive only registered redirect callbacks.
3. Expose access tokens to API calls as Bearer credentials.
4. Keep refresh capability in the selected platform secure storage mechanism.
5. Clear local auth state and provider session state on logout as supported by
   the provider SDK.

Mobile should use Keychain/Keystore-backed storage through the chosen native
library. Desktop should use the OS credential vault or keychain rather than a
plain renderer-side file or browser local storage.

## Local Verification

1. Configure the provider issuer, API audience, Web client ID, and Web callback
   URL for the environment under test.
2. Create or provision a `user_external_identity` mapping for the OIDC user
   that will sign in.
3. Verify portal validation and authorization:

   ```bash
   ./gradlew :abacusflow-portal:abacusflow-portal-web:test
   ```

4. Verify the static Web client still builds without server-only auth features:

   ```bash
   cd abacusflow-apps
   npm run lint -w abacusflow-web
   npm run build -w abacusflow-web
   ```

5. Sign in through the provider and inspect a protected portal request. It
   should send `Authorization: Bearer <access_token>`. Missing, expired,
   invalid, wrong-audience, unlinked, disabled, or locked identities must not
   receive protected data.
