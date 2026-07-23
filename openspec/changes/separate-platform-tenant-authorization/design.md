## Context

AbacusFlow has one global `user_account` and a tenant-scoped authorization chain `tenant_membership -> role -> permission`. `Permission` is global, but its scope is currently inferred only from the name prefix. The default tenant's seeded `admin` role receives every permission, including `platform:*`, and authentication derives platform permissions from whichever tenant is selected. Tenant role commands load arbitrary permission IDs without a scope check.

The portal security chain authenticates a global user first and `TenantContextFilter` replaces authorities after selecting a membership. The Web bootstrap response already separates `platformPermissions` and `tenantPermissions`, but both are calculated from the selected tenant's roles. Platform pages and tenant pages therefore look separated while sharing the same underlying grants.

Tenant lifecycle is currently open self-service: any authenticated OIDC user is automatically provisioned as an enabled local user, Web redirects a user with no membership to a tenant-creation onboarding page, and `POST /tenants` makes that user the tenant administrator. Membership can be created either directly or through an invitation. Invitation acceptance validates possession of the token but does not verify that the authenticated user's email matches the invitation email.

## Goals / Non-Goals

**Goals:**
- Make platform administration a global user grant that is independent of tenant membership and tenant switching.
- Make it impossible for tenant role management to grant any platform permission.
- Preserve existing legitimate platform administrators during migration.
- Keep platform administration from implicitly granting access to tenant business data.
- Give platform tenant-directory APIs and current-tenant APIs distinct authorization semantics.
- Allow only platform administrators to provision tenants.
- Allow users to join tenants only by accepting invitations bound to their verified identities.
- Keep authenticated users without memberships in a safe no-tenant state where they can accept an invitation but cannot create or enter a tenant.
- Make Web navigation and actions accurately reflect backend permissions.
- Preserve the current local permission catalog and method-security naming convention.

**Non-Goals:**
- Replace Auth0/OIDC or move platform roles into provider-specific claims.
- Implement support impersonation, audited break-glass tenant access, or customer support sessions.
- Implement invitation email delivery; the first release may expose a one-time invitation link to an authorized administrator for delivery through an external channel.
- Replace `TenantContextFilter` with OpenAPI scope metadata and a HandlerInterceptor.
- Add billing, plans, usage metering, multi-cell routing, or dedicated tenant databases.

## Decisions

### Model platform roles separately from tenant roles

Add global `PlatformRole` and assignment tables:

```text
platform_role
platform_role_permission
platform_user_role
```

`PlatformRole` is not tenant-scoped and may contain only `PLATFORM` permissions. Existing `Role` remains tenant-scoped and may contain only `TENANT` or `BUSINESS` permissions. The code shall not model platform administration as membership in a special or default tenant.

Add immutable `PermissionScope` classification:

```text
PLATFORM  <- platform:*
TENANT    <- tenant:*
BUSINESS  <- all domain business permissions
```

Permission name and scope are immutable after creation. Label and description remain editable. Tenant role commands must load every requested permission, reject missing IDs, and reject any `PLATFORM` scope before mutating a managed role. Platform role commands apply the inverse rule.

### Build effective authorities from two independent sources

Authentication resolves global platform roles for the user regardless of tenant selection. Tenant membership resolution continues to produce per-tenant role and permission summaries.

The effective authority set is:

```text
global platform roles and platform permissions
UNION
selected active tenant membership roles and non-platform permissions
```

The JWT authentication converter shall always install global platform authorities. `AbacusFlowAuthenticationDetails` shall retain global platform roles/permissions plus active tenant membership summaries. When `TenantContextFilter` selects a tenant, it shall add the selected membership authorities without discarding global platform authorities.

For endpoints that do not require a tenant, a platform administrator keeps platform authorities even when no tenant is selected. Switching tenants changes only tenant/business authorities. A platform administrator receives tenant business permissions only when the user also has an active membership in that tenant.

### Split platform tenant directory from current-user tenant operations

Use distinct API semantics:

```text
/me/tenants                 memberships available to the current user
/me/invitations/accept      accept an invitation as the authenticated user
/tenant                     current selected tenant profile
/tenant/members             current selected tenant membership administration
/tenant/invitations         invite a user to the current active tenant
/tenant/roles               current selected tenant role administration
/platform/tenants           global tenant directory and platform-only creation/lifecycle
/platform/tenants/{id}/initial-invitation
                            reissue the initial administrator invitation while pending
/platform/users             global user-account administration
/platform/platform-roles    platform administrator role and assignment management
/platform/permissions       global permission catalog
```

Exact paths may be introduced with compatibility aliases during client migration, but platform operations must not call membership-scoped query methods. Platform tenant details expose control-plane metadata and lifecycle state, not tenant products, inventory, orders, files, or analytics. `POST /platform/tenants` requires `platform:tenant:create`; `/me/tenants` is read-only and cannot provision a tenant.

### Provision tenants through an initial administrator invitation

Platform tenant creation requires the tenant profile plus a normalized initial administrator email. It provisions placements and default roles but does not create a membership for the platform administrator or the target user. The tenant starts in `PENDING_ACTIVATION`, and the operation creates an invitation carrying the default tenant `admin` role.

Until the initial invitation is accepted:

- the tenant appears in the platform directory;
- no user may select it or access business data;
- an authorized platform administrator may cancel or reissue the initial invitation;
- an invitation link may be returned once for manual delivery because email delivery is outside this change.

When the intended user accepts the initial invitation, the membership and admin-role assignment are created atomically and the tenant becomes `ACTIVE`. Failure to create either the membership or activation leaves the invitation pending and the tenant non-active.

Existing active tenants and memberships remain active during migration. `PENDING_ACTIVATION` applies to newly platform-provisioned tenants and does not retroactively suspend existing tenants.

### Make every new membership invitation-only

Remove the public/direct add-member operation. Tenant administrators add members by creating invitations containing the intended roles; the only normal runtime use case that creates a membership is successful invitation acceptance. Migration and controlled recovery procedures are explicit system-level exceptions, not user-facing APIs.

Invitation creation accepts any syntactically valid email address and does not require that an account or verified external identity already exist. This lets administrators invite a future user and lets platform administrators nominate the first tenant administrator before that person has registered. The pending invitation is bound to the normalized address, not to a user record created at invitation time.

Invitation acceptance must compare the normalized invitation email with the authenticated external identity's normalized email and require that identity email to be verified. A mismatched, missing, or unverified email is rejected without consuming the invitation or creating a membership. Token possession alone is insufficient.

An authenticated user with no active membership may call bootstrap, list their empty membership set, and accept an invitation without `X-Tenant-Id`. The user may not create a tenant or call any current-tenant/business operation. After acceptance, bootstrap exposes the new membership and the client selects it before issuing tenant-scoped requests.

The primary acceptance experience is identity-driven rather than token-entry-driven. After login, an authenticated user with a verified email may list every unexpired pending invitation whose normalized email matches that identity, including both ordinary member invitations and the initial administrator invitation for a pending tenant. The invitation list exposes tenant and role summaries but never exposes invitation tokens. The user may accept or decline an invitation by invitation ID; both operations revalidate the verified normalized email, invitation status, and expiry at mutation time.

Token acceptance remains as a compatibility path for one-time invitation links and manual delivery while email delivery is unavailable. A token link must not be the only way for the intended user to discover or act on an invitation. Declining an initial administrator invitation leaves the tenant in `PENDING_ACTIVATION`, allowing a platform administrator to reissue the invitation.

Bootstrap exposes the external identity's current email-verification state. If the cached identity is unverified, bootstrap refreshes it from the OIDC provider even inside the normal 24-hour profile-sync window. The Web onboarding route renders a verification-required state and does not request or disclose matching invitations until bootstrap reports a verified email; its recheck action repeats bootstrap first so a newly completed verification becomes effective immediately.

### Expose a tenant-assignable permission catalog

Tenant role pages shall use a dedicated query that returns only `TENANT` and `BUSINESS` permissions and requires `tenant:role:read`. Platform permission catalog operations remain guarded by `platform:permission:read/manage`.

Backend validation is authoritative; hiding platform permissions in the UI is not considered a security control.

### Enforce administration invariants

Add `tenant:info:update` and grant it to the default tenant administrator role only. A read-only member may view tenant information but may not edit it.

Member removal and role reassignment must not leave an active tenant without at least one member whose effective tenant permissions include tenant role/member administration. Platform role reassignment must likewise prevent removal of the final active platform administrator.

A `PENDING_ACTIVATION` tenant is the only valid state without an active tenant administrator. It cannot become `ACTIVE` until initial invitation acceptance atomically creates that administrator. An active tenant cannot transition back to pending to bypass the final-administrator invariant.

Default tenant roles are provisioned consistently for seeded and newly created tenants. `reader` is read-only. `operator` receives explicitly documented business-management permissions and shall not receive member or role administration unless intentionally configured. `admin` receives all tenant and business permissions, never platform permissions.

### Make the Web UI an accurate projection of authorization

Platform menu visibility uses only global platform permissions. Tenant menu and business menu visibility use only the selected tenant summary. Each management action is independently gated:

```text
read permission    -> page/table/detail visibility
create permission  -> create/invite action
update permission  -> edit/assignment action
delete/remove      -> destructive action
manage permission  -> role or permission mutation
```

Direct URL navigation shall render an explicit forbidden state or redirect to the first accessible route. Backend method security remains the final enforcement boundary.

The tenant switcher remains in the header and lists only the current user's memberships. The platform tenant directory lists all tenants and shall not use “switch tenant” as its primary management action.

Users with no membership see an invitation-required state, not a tenant-creation form. Platform tenant creation is visible only with `platform:tenant:create` and requires an initial administrator email. The current-tenant member page exposes invitation actions and existing-member management but no direct “add existing user” action.

## Migration Plan

1. Add `permission.scope`, backfill it deterministically from existing prefixes, and enforce non-null immutable scope.
2. Create platform role and assignment tables plus a seeded `platform-admin` role containing all current `PLATFORM` permissions.
3. Before removing any existing grant, assign `platform-admin` to every distinct user who currently receives a `platform:*` permission through a tenant membership role. Record migration counts and fail deployment if the expected bootstrap administrator would be lost.
4. Remove all `PLATFORM` permission associations from tenant roles and update seed/provisioning logic so no tenant role can recreate them.
5. Land backend permission-scope validation and privilege-escalation tests before exposing platform role mutation APIs.
6. Change authentication and request authority composition to union global platform grants with the selected tenant grant.
7. Add `PENDING_ACTIVATION`, platform-only tenant creation, verified-email invitation acceptance, and invitation-only membership creation. Existing active memberships are preserved.
8. Split platform tenant-directory APIs from membership/current-tenant APIs and regenerate frontend clients; remove the authenticated self-service tenant-creation operation and direct add-member operation.
9. Replace Web tenant-creation onboarding with the invitation-required state, migrate navigation and page actions, then remove compatibility aliases after all clients use the new endpoints.

Rollout must preserve a database-level emergency procedure for assigning the seeded platform role. Because Flyway migrations are forward-only, production must back up the pre-migration platform-grant mapping before removing tenant-role platform permission rows.

## Risks / Trade-offs

- [Platform administrator lockout] A migration or assignment bug could remove all platform access -> migrate assignments before deleting old grants, assert a nonzero administrator count, and document emergency SQL.
- [Temporary double grants] During rollout users may receive platform permissions from both old and new paths -> union and deduplicate authorities, then remove old tenant grants in the same controlled migration window.
- [Authority replacement regression] Tenant selection currently replaces authorities -> add tests proving platform permissions survive tenant switch while permissions from the previous tenant do not.
- [API/client breakage] Separating `/me`, `/tenant`, and `/platform` changes generated clients -> use compatibility aliases for one release and regenerate Web/mobile consumers together.
- [Global role exposure] Platform-role tables intentionally bypass tenant Filter/RLS -> protect every repository use with platform method security and keep the runtime DB role restricted.
- [Frontend-only assumptions] Hidden buttons do not prevent crafted requests -> enforce scope and assignment rules in application services and database constraints where practical.
- [Unactivated tenant deadlock] A tenant has no administrator until the initial invitation is accepted -> keep it non-active, allow platform-authorized reissue/cancellation, and return a one-time link for manual delivery.
- [Invitation token theft] Token possession currently permits the wrong authenticated user to join -> require a matching normalized verified identity email and leave mismatched invitations unconsumed.
- [Existing client self-service] Removing `POST /tenants` and direct member addition breaks onboarding and generated clients -> migrate all clients in the same release and fail forbidden at the backend rather than preserving an insecure alias.

## Open Questions

- Should runtime creation/deletion of permission definitions remain enabled, or should the platform permission page become a read-only catalog with only label/description editing?
- Should platform administrators be assigned exclusively through local database roles, or should a future controlled sync from Auth0 organization/role claims be supported?
