## Why

AbacusFlow currently derives both `platform:*` and tenant/business permissions from the selected tenant membership. The seeded default-tenant `admin` role contains platform permissions, while newly provisioned tenant administrators do not. More critically, tenant role commands accept arbitrary global permission IDs, so a tenant administrator can construct a request that attaches `platform:*` permissions to a tenant role and escalate into platform administration.

The Web information architecture already separates “平台中心” from “租户空间”, but the underlying authorization model does not: platform access changes when the user switches tenants, the platform tenant page only lists the current user's memberships, and read-only users still see management actions that the backend rejects.

The current onboarding flow also allows every authenticated user to create a tenant and become its administrator. That conflicts with the required controlled B2B lifecycle: only the platform may create tenants, and users may enter a tenant only by accepting an invitation intended for their verified identity. The current invitation acceptance checks the token but does not bind the invitation email to the authenticated user's verified email.

## What Changes

- **BREAKING** Separate global platform roles and assignments from tenant-scoped roles and memberships.
- Classify permissions by scope and reject every attempt to attach a platform permission to a tenant role, including guessed permission IDs and crafted API requests.
- Resolve platform authorities independently of tenant selection, then union them with only the selected tenant's authorities for request authorization.
- Migrate existing users who currently receive platform permissions through tenant roles into explicit platform role assignments, then remove platform permissions from tenant roles.
- Split platform tenant-directory operations from current-user tenant membership/switching operations so platform administrators can manage all tenants without automatically receiving their business data.
- **BREAKING** Remove authenticated-user self-service tenant creation and require `platform:tenant:create` for every new tenant.
- Provision a new tenant in `PENDING_ACTIVATION` with an initial administrator invitation; activate it only after the intended verified user accepts that invitation.
- Require invitation acceptance for every new tenant membership, remove direct member-add semantics, and bind invitation acceptance to the authenticated user's normalized verified email.
- Replace new-user tenant-creation onboarding with a no-tenant state that supports accepting an invitation but grants no tenant access.
- Align Web navigation, route access, and page actions with platform, tenant, and business permission checks.
- Add access-matrix and privilege-escalation tests covering ordinary members, tenant administrators, and platform administrators.

## Capabilities

### New Capabilities
- `platform-authorization`: Global platform roles and permissions that remain stable independently of the selected tenant.
- `authorization-aware-admin-ui`: Permission-aware platform, tenant, business navigation and page actions.

### Modified Capabilities
- `tenant-administration`: Platform-controlled tenant provisioning, invitation-only membership, tenant roles, member assignment, tenant profile management, and tenant-directory APIs enforce the platform/tenant boundary.

## Impact

- User, role, permission, tenant membership, invitation, tenant lifecycle, authentication, and authority-building domain/application code.
- Database schema and migration data for platform roles, platform user assignments, permission scope, and pending tenant activation.
- Tenant, role, permission, user, and authentication portal APIs plus regenerated OpenAPI clients.
- Web authentication state, tenant switching, platform pages, tenant pages, business navigation, and action visibility.
- Existing seeded default administrator behavior and production rollout require a data migration that preserves current platform administrators before tenant-role platform grants are removed.
- Existing active memberships remain valid during migration; the invitation-only rule applies to new membership creation after rollout.

## Dependencies

- Builds on `harden-p0-tenant-isolation`, especially active tenant membership resolution, current-tenant authority replacement, and the Filter/RLS boundary.
- Does not require the future OpenAPI request-scope annotation/interceptor change; the current tenant request filter remains in place for this change.
