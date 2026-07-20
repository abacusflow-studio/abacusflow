## Why

AbacusFlow has implemented the main P0 multi-tenant building blocks, but the current request, persistence, scheduler, file, and analytics paths do not yet satisfy the cross-tenant completion criteria in `docs/saas-architecture-evolution-roadmap.md`. In particular, ID-only membership and invitation mutations can cross tenant boundaries, the default database identity can bypass RLS, and several non-generated frontend requests omit the tenant header.

## What Changes

- Bind every tenant-admin mutation to the current tenant: use explicit tenant predicates for control-plane entities and Filter/RLS for tenant-scoped roles.
- Reject business access for inactive tenants and make missing or forged tenant context behavior explicit.
- Run the application with a non-superuser, non-`BYPASSRLS` database role and set the RLS tenant variable inside the active transaction.
- Make scheduled work execute one independent tenant transaction at a time.
- Keep feedback files private and tenant-addressed, and use short-lived backend-issued Cube tokens.
- Ensure all Web and mobile requests carry and reset tenant context consistently.
- Add real PostgreSQL cross-tenant and inventory-concurrency acceptance tests.

## Capabilities

### New Capabilities
- `tenant-isolation`: Enforced application and database tenant boundaries for HTTP requests, background work, files, analytics, and concurrency-sensitive inventory operations.

### Modified Capabilities
- None.

## Impact

- Tenant, role, authentication, inventory, transaction scheduler, storage, and Cube backend modules.
- Portal filter/controllers and OpenAPI-generated tenant APIs.
- Shared frontend API infrastructure plus Web/mobile feedback and tenant-selection flows.
- Database migrations and deployment environment configuration.
- Integration-test infrastructure using PostgreSQL with a restricted application role.
