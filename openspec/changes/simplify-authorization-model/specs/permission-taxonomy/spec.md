## ADDED Requirements

### Requirement: Permission keys use a canonical three-segment grammar
The system MUST represent every permission name as `<scope>:<resource>:<action>` using lowercase ASCII identifiers, where scope is exactly `platform`, `tenant`, or `business`.

#### Scenario: Create or load a canonical permission
- **WHEN** the system creates or loads `business:inventory:adjust`
- **THEN** it classifies the permission as `BUSINESS`
- **AND** it preserves the full permission name as the immutable authority key

#### Scenario: Reject an unknown scope prefix
- **WHEN** a permission name starts with an unknown or misspelled prefix such as `platfrom:user:manage`
- **THEN** the system rejects the permission definition
- **AND** it MUST NOT default the permission to `BUSINESS`

#### Scenario: Reject a malformed permission key
- **WHEN** a permission key is missing the resource or action segment, contains uppercase scope text, or contains unsupported characters
- **THEN** domain creation/loading and application commands reject it

### Requirement: Permission scope and name remain consistent
The system MUST persist an immutable `PermissionScope` that matches the first segment of the immutable permission name and MUST enforce the relationship in domain and application code without relying on a database trigger.

#### Scenario: Scope does not match the name prefix
- **WHEN** the system constructs or loads name `tenant:member:read` with scope `PLATFORM`
- **THEN** domain validation rejects the permission before it can be assigned to a role

#### Scenario: Runtime code attempts to change an authority key
- **WHEN** an application command attempts to update an existing permission name or scope
- **THEN** the operation is rejected
- **AND** role-permission relationships remain unchanged

### Requirement: Fresh initialization seeds only canonical permission names
The development baseline MUST initialize the final authorization model using only `V001` schema and `V002` seed migrations and MUST NOT require legacy permission rename triggers or migrations.

#### Scenario: Initialize a fresh database
- **WHEN** Flyway initializes an empty database
- **THEN** it applies only versions `001` and `002`
- **AND** the permission catalog contains 10 `PLATFORM`, 8 `TENANT`, and 33 `BUSINESS` canonical permissions

#### Scenario: Initialize default role boundaries
- **WHEN** the final seed completes
- **THEN** `platform-admin` contains only the 10 `PLATFORM` permissions
- **AND** tenant `admin` contains the 41 `TENANT` and `BUSINESS` permissions
- **AND** ordinary default roles contain only documented `BUSINESS` permissions

#### Scenario: Existing database contains superseded migration history
- **GIVEN** a development database has already recorded a superseded `V003`, `V004`, or `V005`
- **WHEN** the two-file baseline is adopted
- **THEN** the database is deleted and recreated before application startup
- **AND** no in-place data preservation is promised

### Requirement: Database assignments determine effective grants
The system MUST calculate effective permissions from persisted user-role and role-permission assignments; changing these assignments MUST change subsequent authorization results without changing frontend authorization rules.

#### Scenario: Remove a business permission from a tenant role
- **WHEN** an authorized administrator removes `business:inventory:update` from a tenant role
- **THEN** active memberships using that role no longer receive that authority on subsequent authority resolution

#### Scenario: Platform role does not grant tenant access
- **WHEN** `platform:tenant:update` is assigned through a platform role
- **THEN** the user gains the platform authority
- **AND** gains no `TENANT` or `BUSINESS` authority without an active tenant membership

### Requirement: Permission definitions are controlled authorization contracts
The system MUST treat permission names as deployed backend contracts and MUST NOT imply that an arbitrary runtime-created permission automatically protects an API.

#### Scenario: Platform administrator views the permission catalog
- **WHEN** an authorized platform administrator opens the permission catalog
- **THEN** the system returns canonical permission names, scopes, labels, and descriptions
- **AND** the UI clearly distinguishes catalog metadata from role assignment

#### Scenario: Runtime permission definition mutation is disabled
- **WHEN** a caller attempts to create, rename, or delete a permission definition through a disabled catalog mutation endpoint
- **THEN** the system rejects the operation
- **AND** existing role assignments remain unchanged
