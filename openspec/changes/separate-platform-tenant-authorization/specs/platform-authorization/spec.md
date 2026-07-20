## ADDED Requirements

### Requirement: Platform grants are global and independent of tenant selection
The system MUST assign platform permissions through global platform roles associated directly with a user account and MUST NOT derive them from tenant membership roles.

#### Scenario: Platform administrator has no selected tenant
- **WHEN** a user with an active global platform role calls an authorized platform endpoint without selecting a tenant
- **THEN** the request is authorized from the user's platform permissions
- **AND** no tenant context is established implicitly

#### Scenario: Platform administrator switches tenants
- **WHEN** a platform administrator switches from one active tenant membership to another
- **THEN** the user's platform permissions remain unchanged
- **AND** the previous tenant's tenant and business permissions are removed
- **AND** only the newly selected tenant's tenant and business permissions are added

### Requirement: Tenant roles cannot grant platform permissions
The system MUST classify every permission as `PLATFORM`, `TENANT`, or `BUSINESS` and MUST reject creation or update of a tenant role containing a `PLATFORM` permission.

#### Scenario: Tenant administrator submits a known platform permission ID
- **WHEN** a tenant administrator creates or updates a tenant role with a valid `PLATFORM` permission ID
- **THEN** the system rejects the entire command as invalid
- **AND** no role-permission association from the command is persisted

#### Scenario: Tenant administrator submits guessed and mixed permission IDs
- **WHEN** a tenant administrator submits missing, platform, and tenant permission IDs in one role mutation
- **THEN** the system rejects the entire command before mutating the role
- **AND** the user's effective platform permissions do not change

### Requirement: Effective authorities combine independent scopes
The system SHALL calculate request authorities as the union of the authenticated user's active global platform permissions and the selected active membership's non-platform permissions.

#### Scenario: Platform administrator is not a tenant member
- **WHEN** a platform administrator without membership in a tenant calls that tenant's business endpoint
- **THEN** the request is forbidden
- **AND** the platform grant does not create a tenant membership or business authority

#### Scenario: Ordinary member selects a tenant
- **WHEN** a user without a global platform role selects an active tenant membership
- **THEN** the user receives only that membership's tenant and business permissions
- **AND** the user receives no platform permission

### Requirement: Platform role administration cannot remove the final administrator
The system MUST authorize platform role and user-assignment mutations with global platform permissions and MUST preserve at least one active user with platform-administration authority.

#### Scenario: Remove the final platform administrator
- **WHEN** an authorized administrator attempts to remove or deactivate the last active platform administrator assignment
- **THEN** the system rejects the operation
- **AND** the assignment remains active

#### Scenario: Assign a tenant permission to a platform role
- **WHEN** an administrator creates or updates a platform role with a `TENANT` or `BUSINESS` permission
- **THEN** the system rejects the entire command
- **AND** the platform role remains unchanged

### Requirement: Existing legitimate platform access survives migration
The migration MUST create explicit global platform assignments for every distinct active user who receives a platform permission through the legacy tenant-role model before deleting legacy platform grants.

#### Scenario: Migrate legacy platform administrators
- **WHEN** the authorization migration runs against legacy role assignments
- **THEN** every distinct legacy platform administrator receives the seeded global platform-administrator role
- **AND** no tenant role retains a platform permission after the migration
- **AND** the migration records and validates the number of migrated administrators

#### Scenario: Bootstrap administrator would be lost
- **WHEN** migration validation cannot find an expected active platform administrator
- **THEN** the migration or deployment fails before removing legacy platform grants
