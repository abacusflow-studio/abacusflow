## 1. Freeze decisions and inventory the current state

- [x] 1.1 Confirm `separate-platform-tenant-authorization` is merged or establish the exact commit/change baseline; do not implement this change on a half-renamed model without recording the dependency.
  - **Baseline:** `TenantRole` class renamed, `PlatformRole` separated, and `PermissionScope` contains PLATFORM/TENANT/BUSINESS. No migration has entered a data-preserving shared environment; the user will recreate the database, so squashing initialization into V001/V002 is authorized.
- [x] 1.2 Resolve the three design questions: map `tenant:info:*` to `tenant:profile:*` or retain it, decide whether permission create/delete APIs are removed, and decide whether legacy database table names are retained.
  - **Decision 1:** Map `tenant:info:*` → `tenant:profile:*`. More precise and aligns with the "profile" terminology used in the UI and `updateProfile` domain methods.
  - **Decision 2:** Remove runtime permission create/delete API. Make the platform permission catalog read-only except for `label`/`description` updates. Permission names are deployed contracts.
  - **Decision 3:** Retain legacy database table names (`role`, `role_permission`). Low-risk strategy per design doc. Code-level rename to `TenantRole*` is sufficient; DB table rename would add rollout risk without functional benefit.
- [x] 1.3 Generate a complete permission-key inventory from Flyway migrations, seed data, `@PreAuthorize`, Kotlin tests, OpenAPI descriptions, Web/mobile sources, and documentation; classify every key as canonical platform, canonical tenant, legacy business, or invalid.
  - **Canonical PLATFORM (10):** `platform:tenant:list`, `platform:tenant:create`, `platform:tenant:update`, `platform:tenant:delete`, `platform:user:read`, `platform:user:manage`, `platform:permission:read`, `platform:permission:manage`, `platform:role:read`, `platform:role:manage`
  - **Canonical TENANT target (8):** `tenant:profile:read`, `tenant:profile:update`, `tenant:member:read`, `tenant:member:create`, `tenant:member:update`, `tenant:member:remove`, `tenant:role:read`, `tenant:role:manage`
  - **Legacy BUSINESS (2-segment, need `business:` prefix — 33):** `product:read`, `product:create`, `product:update`, `product:delete`, `product-category:read`, `product-category:create`, `product-category:update`, `product-category:delete`, `purchase-order:read`, `purchase-order:create`, `purchase-order:approve`, `sale-order:read`, `sale-order:create`, `sale-order:approve`, `inventory:read`, `inventory:update`, `inventory-unit:read`, `inventory-unit:update`, `depot:read`, `depot:create`, `depot:update`, `depot:delete`, `customer:read`, `customer:create`, `customer:update`, `customer:delete`, `supplier:read`, `supplier:create`, `supplier:update`, `supplier:delete`, `feedback:read`, `feedback:create`, `feedback:update`
  - **Legacy exceptional TENANT mapping:** `tenant:info:read` → `tenant:profile:read`, `tenant:info:update` → `tenant:profile:update`
  - **Invalid:** None found in current codebase
- [x] 1.4 Produce and review an explicit legacy-to-canonical mapping, including collision detection and the expected permission/role/assignment counts before migration.
  - **Mapping:** All 2-segment `<resource>:<action>` → `business:<resource>:<action>`. Plus `tenant:info:*` → `tenant:profile:*`.
  - **Collision check:** No duplicate canonical keys exist in the final inventory.
  - **Counts:** The clean V002 seed contains 10 PLATFORM + 8 TENANT + 33 BUSINESS = 51 total permissions. This development reset makes no legacy permission-ID preservation promise.

## 2. Complete the TenantRole semantic rename

- [x] 2.1 Finish renaming the domain entity and all imports from `Role` to `TenantRole`; preserve `PlatformRole` as the only global role type.
- [x] 2.2 Rename `RoleRepository`, query methods, entity graphs, JPQL references, and test fixtures to `TenantRoleRepository` and `TenantRole*` terminology.
- [x] 2.3 Rename application types and services (`RoleTO`, inputs, mappers, command/query services and implementations) to `TenantRole*`, without changing `/tenant/roles` REST paths.
- [x] 2.4 Rename portal/OpenAPI schemas and generated TypeScript/Kotlin consumers from generic `Role` to `TenantRole`; exclude unrelated framework types such as React Native accessibility `Role`.
- [x] 2.5 Make the tenant-role permission collection private with a read-only view and atomic replacement method so callers cannot bypass scope validation.
- [x] 2.6 Add `role.tenantId == membership.tenantId` validation to `TenantMembership` and retain the corresponding application-service validation before mutation.
- [x] 2.7 Add compile-time/search assertions or an agreed repository scan proving no ambiguous AbacusFlow `Role*` types remain.
  - **Verification:** Repository symbol/file scan is clean. The sole generic `Role` import is React Native's accessibility type in `components/ui/text.tsx`, which is the documented framework exception.

## 3. Enforce the canonical permission taxonomy

- [x] 3.1 Replace permissive `PermissionScope.fromName` fallback with strict parsing of exactly `platform`, `tenant`, or `business` prefixes and reject malformed three-segment keys.
- [x] 3.2 Centralize canonical backend permission constants or metadata by scope/resource/action and migrate authorization annotations away from hand-typed legacy business strings.
- [x] 3.3 Update all business authorities from `<resource>:<action>` to `business:<resource>:<action>` in use cases, authentication/filter tests, default roles, fixtures, OpenAPI descriptions, Web/mobile sources, and documentation.
- [x] 3.4 Keep `PlatformRole` limited to `PLATFORM`; keep `TenantRole` limited to `TENANT` and `BUSINESS`; ensure both commands resolve every permission ID before any mutation.
- [x] 3.5 Update permission creation validation and platform permission catalog help text to require the canonical grammar; if runtime create/delete is removed, make the API and page read-only except label/description updates.
- [x] 3.6 Add unit tests for valid keys, unknown prefixes, misspelled prefixes, missing segments, invalid characters, scope mismatch, and immutability.

## 4. Consolidate a fresh-database Flyway baseline

- [x] 4.1 Confirm no migration has entered a data-preserving shared environment and record that existing development databases must be deleted and recreated.
- [x] 4.2 Fold the final authorization tables, columns, constraints, indexes, tenant status values, RLS policies and runtime grants into `V001__init_schema.sql`.
- [x] 4.3 Store `permission.scope` as `VARCHAR` with standard JPA enum-string mapping and enforce permission grammar/scope in domain and application code without database permission triggers.
- [x] 4.4 Retain PostgreSQL RLS as an optional tenant-isolation defense, clearly separate from the portable permission workflow.
- [x] 4.5 Seed exactly 51 canonical permissions and final platform/tenant default role relationships in `V002__init_data.sql`.
- [x] 4.6 Advance identity sequences after explicit/bootstrap seed rows so the first runtime insert cannot collide with seeded IDs.
- [x] 4.7 Add a Testcontainers baseline suite proving only V001/V002 run and validating permission counts, role boundaries, bootstrap relationships, sequences and RLS behavior.
- [x] 4.8 Delete superseded V003–V005 and obsolete migration audit/backup/recovery scripts; document destructive development reinitialization and the rule that V001/V002 freeze after first shared deployment.

## 5. Update authority composition and default roles

- [x] 5.1 Update authentication/bootstrap and `TenantContextFilter` fixtures to use canonical keys while preserving the union of global platform permissions and only the selected membership's tenant/business permissions.
- [x] 5.2 Update seeded and newly provisioned `admin` to the approved `TENANT + BUSINESS` set, and `operator`/`reader` to the documented `BUSINESS` sets only.
- [x] 5.3 Keep platform administrators independent of tenant memberships; add a test for a user who is simultaneously a platform administrator, tenant A administrator and tenant B reader.
- [x] 5.4 Re-run final active platform-administrator and final effective tenant-administrator invariants using canonical permission constants.
- [x] 5.5 Add tests proving database role-permission changes affect subsequent authority resolution without frontend policy changes.

## 6. Update API contracts and generated clients

- [x] 6.1 Update OpenAPI examples, descriptions and schema names to canonical permissions and `TenantRole`; keep `/me`, `/tenant/**` and `/platform/**` boundaries unchanged.
- [x] 6.2 Decide and document whether `/me` continues returning one selected-tenant permission list or returns separate tenant-administration/business lists; do not infer missing permissions in the client.
  - **Decision:** `/me` continues returning one combined `tenantPermissions` list (TENANT + BUSINESS) for the selected tenant. The client does not infer missing permissions.
- [x] 6.3 Regenerate backend OpenAPI sources and the shared TypeScript client; update Web and mobile imports/call sites without security-sensitive compatibility aliases.
- [x] 6.4 Add contract tests proving legacy generic `Role` schemas and two-segment business permission examples are absent.

## 7. Simplify Web authorization presentation

- [x] 7.1 Create one typed menu registry containing route, label, icon, display scope and required canonical permission; derive all left navigation from `/me` permission lists.
- [x] 7.2 Retain a single `can(permission)` helper for menu/action presentation and remove role-name-based UI decisions.
- [x] 7.3 Delete `authorization-policy.mjs`, `authorization-policy.d.ts`, and the duplicated route-policy test after equivalent menu-filter tests cover the required personas.
- [x] 7.4 Remove route-level permission maps that duplicate backend method security; route/API 403 responses must use one shared forbidden state or notification.
- [x] 7.5 Update every Web permission literal to canonical keys and update the platform permission catalog UI to the approved read-only/metadata-edit behavior.
- [x] 7.6 Add Web tests for no-tenant invited user, business-only member, tenant administrator, platform-only administrator, and combined platform-plus-multi-tenant user.

## 8. Verify and hand off rollout

- [x] 8.1 Run targeted domain/use-case tests for permission parsing, tenant/platform role mutations, cross-tenant assignment, final-administrator invariants, authentication and tenant switching.
- [x] 8.2 Run relevant backend module tests, server compilation, and the fresh-baseline Testcontainers suite.
- [x] 8.3 Run OpenAPI generated-client checks, Web tests/lint/build, and mobile typecheck/lint for affected shared-client consumers.
  - **Verification:** Generated client, Core lint, Web persona tests/lint/production build, and mobile typecheck pass. Full mobile lint was also run; its failures are pre-existing React Hook violations in unrelated depot/product/partner/drafts/toast sources, with no generated-client or authorization-model error.
- [x] 8.4 Scan the repository for legacy two-segment business authorities, ambiguous authorization `Role*` symbols, stale OpenAPI examples, and duplicate frontend route policy files; review every intentional exception.
  - **Intentional exceptions:** Negative parser/contract fixtures retain legacy keys as rejection examples; React Native accessibility imports its framework `Role` type.
- [ ] 8.5 Execute the persona API matrix with real authenticated sessions, including crafted platform permission assignment, cross-tenant role assignment, direct hidden action, and platform-admin-without-membership requests.
  - **External gate:** Automated security/filter/service personas pass, but a real-session matrix requires a deployed Auth0/API environment and dedicated persona credentials.
- [x] 8.6 Verify seeded effective permissions for representative platform-only, tenant-admin, business-only, and combined users against the approved role boundaries.
- [x] 8.7 Update architecture, permission catalog and initialization documentation, including the rule that assignment tables are dynamic but permission names are deployed contracts and permission validation is application-owned.
- [ ] 8.8 Run `git diff --check`, preserve unrelated local work, and obtain a security-focused review before rollout.
  - **Verification:** `git diff --check` and `git diff HEAD --check` pass, and unrelated staged/work-in-progress files were preserved. Independent security review remains a rollout gate.
