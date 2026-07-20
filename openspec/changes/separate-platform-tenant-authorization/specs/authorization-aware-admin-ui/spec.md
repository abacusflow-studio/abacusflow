## ADDED Requirements

### Requirement: No-tenant onboarding is invitation-only
The Web application MUST show an invitation-required state to an authenticated user without memberships and MUST NOT offer self-service tenant creation.

#### Scenario: New user has no memberships
- **WHEN** bootstrap reports that the authenticated user has no active membership
- **THEN** the user sees instructions to obtain or accept an invitation
- **AND** no create-tenant form or tenant/business navigation is rendered

#### Scenario: New user opens the former onboarding URL
- **WHEN** a user without platform tenant-creation permission opens the former tenant-creation onboarding route
- **THEN** the Web application renders the invitation-required state or redirects to it
- **AND** no self-service create request is available

### Requirement: Platform tenant creation captures the initial administrator invitation
The platform tenant page MUST show tenant creation only to users with `platform:tenant:create` and MUST require a valid initial administrator email.

#### Scenario: Authorized platform administrator creates a tenant
- **WHEN** a platform administrator submits valid tenant data and an initial administrator email
- **THEN** the new tenant appears as pending activation
- **AND** the UI presents the one-time invitation delivery result without switching into the tenant

#### Scenario: Platform tenant reader lacks create permission
- **WHEN** a user has `platform:tenant:list` but lacks `platform:tenant:create`
- **THEN** the tenant directory remains visible
- **AND** tenant creation and initial-invitation reissue controls are not actionable

### Requirement: Tenant member management exposes invitations rather than direct addition
The tenant member page MUST use invitation operations for new members and MUST NOT expose a direct add-existing-user action.

#### Scenario: Tenant administrator adds a future member
- **WHEN** a tenant administrator starts the add-member workflow
- **THEN** the UI requests the invitee email and tenant roles
- **AND** submission creates a pending invitation rather than an immediate membership

#### Scenario: Read-only member views membership data
- **WHEN** a member can read members but cannot create invitations
- **THEN** existing members remain visible
- **AND** invitation creation is not actionable

### Requirement: Navigation reflects platform and selected-tenant authorization independently
The Web application MUST derive platform navigation from global platform permissions and tenant/business navigation from the selected tenant's permission summary.

#### Scenario: Tenant administrator without platform access
- **WHEN** a tenant administrator signs in with no global platform permission
- **THEN** tenant-space administration navigation is visible according to the selected membership
- **AND** platform-center navigation is hidden

#### Scenario: Platform administrator without a tenant membership
- **WHEN** a platform administrator signs in without an active tenant membership
- **THEN** authorized platform-center navigation is visible
- **AND** tenant-space and business navigation requiring a membership is hidden

#### Scenario: Ordinary member switches tenants
- **WHEN** an ordinary member switches to a membership with a different permission set
- **THEN** tenant and business navigation updates to the newly selected tenant
- **AND** no navigation remains visible solely because it was allowed in the previous tenant

### Requirement: Management actions are gated by their exact permissions
The Web application SHALL distinguish page read access from create, update, delete, assignment, invitation, and management actions and SHALL hide or disable actions the user cannot invoke.

#### Scenario: Read-only member views members
- **WHEN** a member has member read permission but lacks invitation, update, and removal permissions
- **THEN** the member list remains visible
- **AND** invite, role-assignment, status-change, and remove actions are not actionable

#### Scenario: Role reader views roles
- **WHEN** a member has role read permission but lacks role management permission
- **THEN** the role list and details remain visible
- **AND** create, edit, permission-assignment, and delete controls are not actionable

### Requirement: Direct navigation enforces route authorization
The Web application MUST check route-level permissions independently of menu visibility and MUST display an explicit forbidden state or redirect to an accessible route when authorization is missing.

#### Scenario: User opens a hidden platform URL directly
- **WHEN** a user without the required global platform read permission navigates directly to a platform route
- **THEN** protected page data is not rendered
- **AND** the user sees a forbidden state or is redirected to an authorized route

#### Scenario: Client state is stale after a permission change
- **WHEN** the backend rejects an action or route because the user's permission has been removed
- **THEN** the Web application does not treat a previously visible control as proof of authorization
- **AND** it presents the forbidden response without leaking protected data

### Requirement: Platform tenant directory is distinct from the tenant switcher
The Web application MUST populate the header tenant switcher from the current user's memberships and MUST populate platform tenant management from the global platform tenant-directory API.

#### Scenario: Platform administrator manages a non-member tenant
- **WHEN** a platform administrator opens the platform tenant directory
- **THEN** the tenant appears even if the administrator has no membership
- **AND** control-plane management actions are shown according to platform permissions
- **AND** switching into that tenant is not presented as the primary management action

#### Scenario: User opens the tenant switcher
- **WHEN** any authenticated user opens the tenant switcher
- **THEN** only tenants with an available membership are listed
- **AND** a platform grant alone does not make a tenant switchable

### Requirement: Persona access behavior is covered by automated tests
The Web authorization layer MUST have automated coverage for an ordinary member, a tenant administrator without platform grants, and a platform administrator with and without tenant membership.

#### Scenario: Run the authorization access matrix
- **WHEN** the navigation, route, and action authorization test suite runs
- **THEN** each persona sees only its authorized scope and actions
- **AND** tenant switching changes only the selected tenant's permissions
- **AND** platform permissions remain independent of tenant selection
