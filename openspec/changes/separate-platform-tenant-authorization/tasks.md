## 1. Close the tenant-to-platform privilege-escalation path

- [x] 1.1 Add immutable `PermissionScope` (`PLATFORM`, `TENANT`, `BUSINESS`) to the permission model, persistence mapping, and schema; backfill existing permissions deterministically and test the classification.
- [x] 1.2 Change tenant role create/update services to resolve every requested permission ID before mutation and atomically reject missing IDs or any `PLATFORM` permission.
- [x] 1.3 Add privilege-escalation tests for known, guessed, mixed-scope, cross-tenant, and partially invalid permission IDs; assert that rejected commands leave roles and effective authorities unchanged.
- [x] 1.4 Add a tenant-assignable permission query/API guarded by `tenant:role:read` that returns only `TENANT` and `BUSINESS` permissions, and change tenant role consumers to use it.

## 2. Introduce global platform authorization

- [x] 2.1 Add global `PlatformRole`, platform-role permission, and user-platform-role assignment models and repositories outside tenant Filter/RLS scope.
- [x] 2.2 Enforce the inverse scope rule for platform roles: only existing `PLATFORM` permissions may be assigned, and invalid commands are atomic.
- [x] 2.3 Add platform role and assignment use cases guarded by global platform permissions, including the invariant that the final active platform administrator cannot be removed or deactivated.
- [x] 2.4 Add a migration that seeds `platform-admin`, assigns it to all distinct active legacy platform administrators, verifies migration counts, then removes every platform-permission association from tenant roles.
- [x] 2.5 Update seed and tenant-provisioning logic so seeded and new `admin` roles contain all tenant/business permissions but never platform permissions; align and document `reader` and `operator` defaults.
- [x] 2.6 Document and test the production emergency procedure for restoring the seeded platform-administrator assignment without granting tenant business access.

## 3. Compose authentication authorities by scope

- [x] 3.1 Extend authentication details/bootstrap data to carry global platform roles and permissions independently from tenant membership summaries.
- [x] 3.2 Resolve and install global platform authorities during JWT authentication even when no tenant is selected.
- [x] 3.3 Update `TenantContextFilter` authority replacement so it preserves global platform authorities, removes the previous membership's authorities, and adds only the newly selected active membership's tenant/business authorities.
- [x] 3.4 Add authentication and filter tests proving platform access survives tenant switches, previous-tenant authorities do not, ordinary members gain no platform access, and platform administrators gain no tenant business access without membership.

## 4. Enforce platform-created, invitation-only tenant lifecycle

- [x] 4.1 Add `PENDING_ACTIVATION` to the tenant lifecycle and schema; migrate existing tenants without changing their current active/suspended/deprovisioned state.
- [x] 4.2 Replace self-service tenant creation with a platform provisioning command guarded by `platform:tenant:create` that requires an initial administrator email and atomically creates the pending tenant, placement, default roles, and admin invitation without any membership.
- [x] 4.3 Ensure the platform creator receives no tenant membership or business authority, and make pending tenants unavailable to membership selection, tenant context, and business queries.
- [x] 4.4 Extend authenticated identity details with normalized email and verification state; require a matching verified email for every invitation acceptance and leave mismatched/missing/unverified invitations unconsumed.
- [x] 4.5 Make initial administrator acceptance atomically create the admin membership, consume the invitation, and activate the tenant; roll back all three results on failure.
- [x] 4.6 Remove the direct add-member portal/use-case operation so successful invitation acceptance is the only normal runtime path that creates a membership; preserve existing memberships during rollout.
- [x] 4.7 Add platform-authorized cancellation/reissue for a pending tenant's initial invitation and a one-time manual-delivery result while email delivery remains out of scope.
- [x] 4.8 Add lifecycle and invitation security tests for unauthorized tenant creation, platform provisioning, pending-tenant access, initial activation rollback, token theft, email normalization, unverified email, expired invitations, and direct-add rejection.

## 5. Separate platform, current-tenant, and current-user APIs

- [x] 5.1 Define distinct OpenAPI operations for read-only current-user memberships, invitation acceptance, current selected tenant administration, tenant invitations, and the global platform tenant directory/provisioning/lifecycle.
- [x] 5.2 Remove the legacy authenticated `POST /tenants` operation and direct member-add operation without an insecure compatibility alias.
- [x] 5.3 Implement platform tenant-directory queries against all tenants rather than current-user memberships, returning only control-plane metadata and enforcing `platform:tenant:*` permissions.
- [x] 5.4 Keep tenant switching limited to active memberships and reject attempts to select a pending tenant or a tenant available only through a platform grant.
- [x] 5.5 Add `tenant:info:update`, guard tenant profile mutation separately from reads, and grant it only to the default tenant administrator role.
- [x] 5.6 Prevent membership removal, suspension, or role reassignment from leaving an active tenant without an effective administrator; only pending activation may exist without one.
- [x] 5.7 Add integration tests for the platform/tenant/no-tenant API boundary and the new-user, ordinary-member, tenant-administrator, and platform-administrator access matrix.
- [x] 5.8 Regenerate shared frontend API types/clients and migrate Web/mobile call sites; retain compatibility aliases only for non-security-sensitive path moves and the agreed migration window.

## 6. Align Web onboarding, navigation, routes, and actions

- [x] 6.1 Refactor Web auth state and permission helpers so global platform permissions and selected-tenant permissions are queried separately.
- [x] 6.2 Replace tenant-creation onboarding with an invitation-required/no-tenant state that can accept an invitation but exposes no tenant or business navigation.
- [x] 6.3 Move tenant creation to the platform tenant page, require `platform:tenant:create` plus an initial administrator email, show pending activation and invitation reissue state, and never auto-switch the platform creator into the tenant.
- [x] 6.4 Remove direct add-existing-user UI and make the tenant member workflow create invitations with email and tenant roles.
- [x] 6.5 Build platform-center navigation only from global platform permissions and tenant/business navigation only from the selected membership summary.
- [x] 6.6 Add route-level guards and an explicit forbidden state for direct navigation without the required read permission.
- [x] 6.7 Gate tenant member, invitation, role, profile, platform tenant, user, permission, and platform-role actions by their exact create/update/delete/manage permissions rather than page visibility alone.
- [x] 6.8 Populate the header tenant switcher only from `/me/tenants`, and populate platform tenant management from `/platform/tenants` without presenting pending or non-member tenants as switchable.
- [x] 6.9 Add Web tests for a no-tenant invited user, read-only users, tenant administrators without platform grants, and platform administrators with and without tenant membership.

## 7. Verify rollout and regression safety

- [x] 7.1 Run targeted domain/use-case/portal tests for role mutation, platform assignment, platform provisioning, invitation acceptance, tenant membership, authentication, and tenant context, followed by the relevant backend module test suites.
- [x] 7.2 Run migration smoke tests on a legacy-like dataset and assert preserved platform-administrator counts, preserved existing memberships, zero platform permissions on tenant roles, and no unexpected tenant access.
- [x] 7.3 Run the generated-client checks plus Web lint, tests, and build; run mobile typecheck/lint for changed shared-client consumers.
  - Mobile typecheck passes. Full mobile lint was run and reports 14 pre-existing React-hooks errors in unchanged depot/draft/product/partner and `use-toast` files.
- [ ] 7.4 Manually verify the persona access matrix through real API calls and Web navigation, including crafted tenant creation, direct membership, stolen invitation token, and hidden-action requests.
  - Real unauthenticated API probes return 401 and the automated persona matrix passes; authenticated browser verification remains pending because no browser instance/authenticated persona sessions are available.
- [x] 7.5 Run `git diff --check` and confirm no unrelated user changes were modified before completing the change.
