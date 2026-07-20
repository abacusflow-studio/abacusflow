## MODIFIED Requirements

### Requirement: Tenant roles distinguish administration and business through permissions
The system MUST use the permissions contained by `TenantRole`, rather than a global user type, to determine whether a membership is an ordinary business member or a tenant administrator.

#### Scenario: Ordinary member has a business-only role
- **WHEN** an active membership has roles containing only `BUSINESS` permissions
- **THEN** the member may use the corresponding current-tenant business operations
- **AND** receives no tenant member, role, invitation, or profile-management authority

#### Scenario: Tenant administrator has mixed permissions
- **WHEN** an active membership has a role containing `TENANT` and `BUSINESS` permissions
- **THEN** the member may use the granted tenant administration operations
- **AND** may use only the explicitly granted business operations

### Requirement: A membership can use only roles from the same tenant
The system MUST reject adding or replacing membership roles when any role belongs to a different tenant, at both the application-service boundary and the domain boundary.

#### Scenario: Assign a role from another tenant
- **WHEN** an authorized administrator submits a role ID whose `tenantId` differs from the membership tenant
- **THEN** the complete role replacement is rejected
- **AND** the membership's existing roles remain unchanged

### Requirement: Default tenant roles use canonical scopes
New tenant provisioning and seed data MUST create documented `admin`, `operator`, and `reader` roles using canonical permission names.

#### Scenario: Provision the default admin role
- **WHEN** a new tenant is provisioned
- **THEN** its `admin` role receives the intended `TENANT` and `BUSINESS` permissions
- **AND** receives no `PLATFORM` permission

#### Scenario: Provision ordinary default roles
- **WHEN** a new tenant is provisioned
- **THEN** `operator` and `reader` receive only documented `BUSINESS` permissions unless an explicit tenant-administration grant is approved

### Requirement: Active tenants retain an effective tenant administrator
Initialization, role updates, membership suspension, and membership removal MUST NOT leave an active tenant without at least one active membership holding the configured tenant-administration authority set.

#### Scenario: Initialize the bootstrap tenant administrator
- **WHEN** the final seed initializes the bootstrap tenant and canonical permissions
- **THEN** the bootstrap tenant has an active membership holding the canonical tenant-administration authority set

#### Scenario: Remove the final tenant administrator's role
- **WHEN** an administrator attempts to remove the last effective tenant-administration grant from an active tenant
- **THEN** the operation is rejected atomically
