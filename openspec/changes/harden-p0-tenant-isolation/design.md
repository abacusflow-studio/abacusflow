## Context

Tenant context currently originates in `TenantContextFilter` and is propagated through a `ThreadLocal`. Tenant-scoped JPA entities already declare Hibernate `tenantFilter`, and jOOQ queries usually include explicit tenant predicates. However, Hibernate 6.6 does not apply a filter to identifier loads by default (`FilterDef.applyToLoadByKey = false`), and control-plane entities such as memberships and invitations do not declare the filter. Those application services must therefore bind ID-based mutations to the current tenant explicitly. PostgreSQL RLS remains the database backstop. The same datasource user currently performs Flyway migrations and application queries, which conflicts with the roadmap requirement for a restricted runtime role.

## Goals / Non-Goals

**Goals:**
- Close every known IDOR path in tenant administration.
- Make tenant status and membership status authoritative for request access.
- Make RLS effective under the actual runtime database identity.
- Preserve a single-cell, single-database P0 deployment.
- Prove isolation using real PostgreSQL tests rather than mocked repositories alone.

**Non-Goals:**
- Multi-cell routing, sharding, dedicated tenant databases, billing, or usage metering.
- A general control-plane service split.
- Cross-region deployment or online tenant migration.

## Decisions

### Use the isolation mechanism owned by each entity category

Membership and invitation mutations shall load control-plane records by both resource ID and current tenant ID because those entities intentionally do not use the business-data Filter/RLS policy. Role reads and writes shall require `CurrentTenantProvider`, then use ordinary repository operations protected by the Role entity's Hibernate Filter and PostgreSQL RLS. Controllers shall not accept a freely supplied business tenant ID.

### Separate platform lookup from tenant business access

Authentication may enumerate active memberships and tenant records without a selected tenant. Once a business tenant is selected, access requires both an active membership and an active tenant. Suspended or deprovisioned tenants shall not contribute request authorities.

### Separate migration and runtime database privileges

Flyway/migration credentials may own schema objects. The runtime datasource shall use a distinct login that is not a superuser, does not own tenant tables, and has no `BYPASSRLS`, DDL, or TRUNCATE privileges. RLS session state must be set on the same connection and inside the transaction that executes business SQL.

Authentication, tenant creation, and invitation acceptance begin as control-plane flows without a selected tenant. Once they resolve a concrete tenant, they explicitly activate the Hibernate Filter and RLS variable on their already-active transaction before touching tenant-scoped roles.

### Use one transaction per scheduled tenant

The scheduler coordinator enumerates active tenants without wrapping the whole loop in one business transaction. A separately proxied worker opens a transaction after establishing tenant context and executes only that tenant's query/update set.

### Keep files private and analytics tokens short-lived

Stored object keys retain `tenants/{tenantId}/...`; clients receive an application-controlled or presigned short-lived URL rather than a permanent public URL. Cube queries use a backend-issued JWT containing `tenantId` and `exp`, and Cube always appends the tenant predicate.

## Risks / Trade-offs

- Restricting the runtime DB role can expose control-plane flows that accidentally depended on RLS bypass; cover tenant creation and invitation acceptance before enabling it in production.
- Control-plane repositories retain explicit tenant-bound signatures; tenant-scoped business repositories stay concise and rely on the shared Filter/RLS boundary.
- One transaction per scheduled tenant increases transaction count but avoids mixed-tenant failure and context leakage.
- Presigned URLs require client handling for expiration and refresh.

## Migration Plan

1. Close application-layer IDOR paths and add focused tests.
2. Enforce active tenant selection and missing-context behavior.
3. Introduce restricted runtime DB-role provisioning and PostgreSQL RLS integration tests.
4. Split scheduled coordinators from transactional tenant workers.
5. Switch files and Cube to tenant-bound short-lived access.
6. Align Web/mobile tenant headers and context reset behavior.
7. Run the complete P0 cross-tenant and inventory-concurrency acceptance suite.

Rollback must preserve the previous migration role and deployment variables until the restricted runtime role has passed tenant creation, invitation acceptance, business CRUD, scheduler, and Cube/file smoke tests.
