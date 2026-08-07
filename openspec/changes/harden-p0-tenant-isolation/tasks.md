## 1. Tenant Administration Boundary

- [x] 1.1 Bind membership role updates to the current tenant and reject cross-tenant role IDs.
- [x] 1.2 Bind invitation cancellation and listing/mutation lookups to the current tenant while preserving token-based acceptance.
- [x] 1.3 Require current tenant context for role operations and rely on the Role Filter/RLS boundary without duplicate tenant repository parameters.
- [x] 1.4 Add focused service tests proving cross-tenant IDs return not found and do not mutate data.

## 2. Tenant Access Context

- [x] 2.1 Exclude suspended/deprovisioned tenants from authentication membership details and request authorities.
- [x] 2.2 Build request tenant details only from active memberships and active tenants, then consume them in the request filter.
- [x] 2.3 Return 400 for multi-tenant business requests without `X-Tenant-Id`, while preserving bootstrap/onboarding endpoints.
- [x] 2.4 Preserve `TenantWriteGuard` as the explicit P0 write-control extension point; active tenants remain writable in P0.

## 3. PostgreSQL RLS Runtime

- [x] 3.1 Provision separate migration and restricted runtime database roles without superuser, ownership, or `BYPASSRLS` privileges.
- [x] 3.2 Set `app.tenant_id` on the active transaction connection for JPA and jOOQ paths.
- [x] 3.3 Activate Filter/RLS after resolving a tenant during tenant creation, invitation acceptance, and authentication enumeration.
- [x] 3.4 Add PostgreSQL integration tests for read/write isolation and omitted tenant predicates.

## 4. Scheduled Work And Inventory Concurrency

- [x] 4.1 Split scheduled tenant enumeration from per-tenant transactional workers.
- [x] 4.2 Apply pessimistic locking or an atomic update to stock reservation/deduction paths.
- [x] 4.3 Add concurrent stock tests proving no oversell or partial committed order.

## 5. Files, Cube, And Frontend Context

- [x] 5.1 Replace permanent public file URLs with private short-lived access while retaining tenant-prefixed keys.
- [x] 5.2 Add expiration to backend Cube tokens, fail closed on missing signing configuration, and make Web Cube queries use them.
- [x] 5.3 Add the tenant header to direct Web/mobile upload requests.
- [x] 5.4 Validate stored tenant IDs against current memberships and clear tenant-local client state on switch/logout.
- [x] 5.5 Inject one generated Cube signing secret into the backend and Cube, remove the committed secret, and disable Cube production development mode.
- [x] 5.6 Cache Cube tokens per selected tenant, deduplicate in-flight token requests, and clear analytics state on switch/logout.
- [x] 5.7 Provision a dedicated read-only Cube database identity and keep PostgreSQL RLS active by setting the verified tenant on Cube connections.
- [x] 5.8 Bound concurrent dashboard Cube queries to reduce database and Cube memory pressure.
- [x] 5.9 Add real two-tenant Cube/PostgreSQL tests for joined queries and forged tenant tokens.

## 6. Verification

- [x] 6.1 Run backend tests, Web lint/build checks, mobile typecheck/lint, and `git diff --check`.
- [x] 6.2 Execute the PostgreSQL cross-tenant matrix with two tenants and a restricted runtime DB identity.
