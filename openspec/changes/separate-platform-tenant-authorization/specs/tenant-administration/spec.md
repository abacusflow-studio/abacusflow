## ADDED Requirements

### Requirement: Only the platform can provision tenants
The system MUST expose tenant creation only as a global platform operation guarded by `platform:tenant:create` and MUST NOT allow an ordinary authenticated user to create a tenant.

#### Scenario: User calls platform tenant creation
- **WHEN** an authenticated user without `platform:tenant:create` submits a valid platform tenant-creation request
- **THEN** the system returns forbidden
- **AND** no tenant, default role, placement, invitation, or membership is created

#### Scenario: User calls the legacy self-service operation
- **WHEN** an authenticated user submits the former self-service `POST /tenants` operation
- **THEN** the operation is unavailable
- **AND** the user does not become a tenant administrator

#### Scenario: Platform administrator provisions a tenant
- **WHEN** a user with `platform:tenant:create` submits valid tenant data and an initial administrator email
- **THEN** the tenant, placement, and default roles are provisioned in `PENDING_ACTIVATION`
- **AND** a pending invitation grants the default `admin` role to the normalized initial administrator email
- **AND** neither the platform administrator nor the invited user receives a membership before acceptance

### Requirement: Initial administrator acceptance activates the tenant atomically
A newly platform-provisioned tenant MUST remain non-selectable and without business access until its initial administrator invitation is validly accepted.

#### Scenario: Initial administrator accepts the invitation
- **WHEN** the intended user with a matching verified email accepts the unexpired initial administrator invitation
- **THEN** the system atomically creates the admin membership, consumes the invitation, and changes the tenant to `ACTIVE`
- **AND** the tenant becomes available in that user's switchable memberships

#### Scenario: Initial activation fails
- **WHEN** membership creation or tenant activation fails while accepting the initial invitation
- **THEN** the transaction rolls back
- **AND** the tenant remains `PENDING_ACTIVATION`
- **AND** the invitation remains unconsumed

#### Scenario: Access a pending tenant
- **WHEN** any user attempts to select or access business data for a `PENDING_ACTIVATION` tenant
- **THEN** the system returns forbidden without establishing tenant context

### Requirement: New tenant memberships are invitation-only
The system MUST create a normal runtime tenant membership only through successful invitation acceptance and MUST NOT expose a direct add-member operation.

#### Scenario: Tenant administrator invites a member
- **WHEN** a tenant administrator with `tenant:member:create` creates an invitation with tenant-valid roles
- **THEN** a pending invitation is created
- **AND** no membership exists until the invitation is accepted

#### Scenario: Invitee has not registered or verified an account
- **WHEN** an administrator creates an invitation for a syntactically valid email that has no existing verified external identity
- **THEN** the pending invitation is created for the normalized email
- **AND** no placeholder user or membership is created
- **AND** the invitation can be discovered and accepted only after a user proves ownership through a matching verified login email

#### Scenario: Client calls the former direct add-member operation
- **WHEN** a client attempts to directly add an existing user to a tenant
- **THEN** the operation is unavailable
- **AND** no membership or role assignment is created

#### Scenario: Preserve existing memberships during rollout
- **WHEN** the invitation-only membership migration is applied
- **THEN** existing active memberships and their tenant roles remain valid
- **AND** only new membership creation is restricted to invitation acceptance

### Requirement: Invitations are bound to a verified authenticated identity
Invitation acceptance MUST require the normalized invitation email to equal the authenticated external identity's normalized verified email; possession of the invitation token alone MUST NOT be sufficient.

#### Scenario: Matching verified email accepts an invitation
- **WHEN** an authenticated user presents a valid invitation token and the user's verified email matches after normalization
- **THEN** the invitation may be accepted
- **AND** the membership is created for that authenticated user only

#### Scenario: Different authenticated user obtains the token
- **WHEN** an authenticated user's email does not match the invitation email
- **THEN** the system rejects the acceptance
- **AND** the invitation remains pending
- **AND** no membership is created

#### Scenario: Identity email is missing or unverified
- **WHEN** the authenticated identity has no email or the provider has not verified it
- **THEN** the system rejects the acceptance
- **AND** the invitation remains pending

### Requirement: Authenticated users manage invitations matched to their identity
The system MUST allow an authenticated user with a verified email to list and act on unexpired pending invitations addressed to that normalized email without requiring an invitation token or `X-Tenant-Id`.

#### Scenario: User lists matching invitations
- **WHEN** a user with a verified email requests their pending invitations
- **THEN** the response contains every unexpired pending ordinary and initial-administrator invitation addressed to that normalized email
- **AND** each result contains tenant and role summaries but no invitation token

#### Scenario: User accepts a matching invitation by ID
- **WHEN** the intended user accepts an unexpired pending invitation by invitation ID
- **THEN** the system revalidates the user's verified normalized email and performs the same atomic membership and activation behavior as token acceptance

#### Scenario: User declines a matching invitation
- **WHEN** the intended user declines an unexpired pending invitation by invitation ID
- **THEN** the invitation becomes declined and cannot subsequently create a membership
- **AND** an initial-administrator invitation leaves its tenant in `PENDING_ACTIVATION`

#### Scenario: User queries or mutates another identity's invitation
- **WHEN** a user has an unverified email or attempts to accept or decline an invitation addressed to a different normalized email
- **THEN** the system rejects the operation without exposing or consuming the invitation

### Requirement: Users without memberships remain in a safe global state
An authenticated user without an active tenant membership MUST be able to bootstrap and accept an invitation without `X-Tenant-Id`, but MUST NOT receive tenant permissions or access tenant-scoped operations.

#### Scenario: New user bootstraps without an invitation
- **WHEN** a newly authenticated user has no active membership
- **THEN** bootstrap returns an invitation-required/no-tenant state with an empty switchable tenant list
- **AND** the user receives no tenant or business authority

#### Scenario: New user calls a tenant operation
- **WHEN** a user without an active membership calls a tenant-scoped operation
- **THEN** the system returns forbidden without establishing tenant context

### Requirement: Tenant administration uses only tenant-assignable permissions
The system MUST expose a tenant role permission catalog containing only `TENANT` and `BUSINESS` permissions and MUST authorize access to it with `tenant:role:read` in the selected tenant.

#### Scenario: Tenant role page loads assignable permissions
- **WHEN** a member with `tenant:role:read` requests permissions assignable to a tenant role
- **THEN** the response contains tenant and business permissions
- **AND** the response contains no platform permission

#### Scenario: Member lacks tenant role read permission
- **WHEN** a member without `tenant:role:read` requests the tenant-assignable permission catalog
- **THEN** the system returns forbidden

### Requirement: Current-tenant and platform tenant APIs have separate semantics
The system MUST distinguish the current user's tenant memberships, current selected tenant administration, and the global platform tenant directory.

#### Scenario: User lists switchable tenants
- **WHEN** an authenticated user requests the current user's tenant list
- **THEN** the response contains only active memberships available to that user
- **AND** it is suitable for selecting the current tenant

#### Scenario: Platform administrator lists tenants
- **WHEN** a user with `platform:tenant:list` requests the platform tenant directory
- **THEN** the response may contain tenants where that user has no membership
- **AND** it exposes control-plane metadata without tenant business data

#### Scenario: Platform administrator opens tenant business data without membership
- **WHEN** a platform administrator selects or queries business data for a tenant where the user has no active membership
- **THEN** the system returns forbidden

### Requirement: Tenant profile updates require explicit authority
The system SHALL authorize reading a current tenant profile separately from editing it and MUST require `tenant:info:update` for profile mutations.

#### Scenario: Read-only member views tenant profile
- **WHEN** a member has tenant information read permission but lacks `tenant:info:update`
- **THEN** the member can view the current tenant profile
- **AND** an attempted profile update is forbidden

#### Scenario: Tenant administrator edits tenant profile
- **WHEN** a member with `tenant:info:update` updates the selected tenant profile with valid data
- **THEN** the selected tenant is updated
- **AND** no other tenant is changed

### Requirement: Tenant administration preserves an active administrator
Membership removal, suspension, and role reassignment MUST NOT leave an active tenant without an active member capable of administering tenant members and roles.

#### Scenario: Remove the final tenant administrator
- **WHEN** an administrator attempts to remove, suspend, or demote the final effective tenant administrator
- **THEN** the system rejects the operation
- **AND** the membership and its role assignments remain unchanged

#### Scenario: Remove one of multiple tenant administrators
- **WHEN** an administrator removes or demotes one administrator while another effective administrator remains active
- **THEN** the operation succeeds if all other authorization rules pass

### Requirement: Default tenant roles are provisioned consistently
Every newly provisioned tenant and every seeded tenant MUST receive equivalent default `reader`, `operator`, and `admin` role semantics.

#### Scenario: Provision a new tenant
- **WHEN** tenant provisioning completes
- **THEN** `reader` contains only read permissions
- **AND** `operator` contains the documented business-operation permissions but no member or role administration permission
- **AND** `admin` contains all tenant and business permissions but no platform permission

#### Scenario: Compare seeded and newly provisioned tenants
- **WHEN** default roles from a seeded tenant and a newly provisioned tenant are compared
- **THEN** roles with the same default name have equivalent permission scope and administration semantics
