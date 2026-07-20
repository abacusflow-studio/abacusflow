## MODIFIED Requirements

### Requirement: Platform and tenant role types remain separate
The system MUST model global platform roles as `PlatformRole` and tenant-scoped roles as `TenantRole`; it MUST NOT model platform administration as a tenant membership or a nullable-tenant generic role.

#### Scenario: User is only a platform administrator
- **WHEN** a user has an active `PlatformRole` but no tenant membership
- **THEN** the user receives only `PLATFORM` authorities
- **AND** can use authorized platform endpoints without selecting a tenant

#### Scenario: Platform administrator is also a tenant administrator
- **WHEN** a platform administrator selects an active membership whose `TenantRole` contains `TENANT` and `BUSINESS` permissions
- **THEN** effective authorities are the union of global platform authorities and that membership's authorities
- **AND** switching tenants replaces only the tenant and business portion

### Requirement: Role types enforce inverse permission boundaries
`PlatformRole` MUST accept only `PLATFORM` permissions, while `TenantRole` MUST accept `TENANT` and `BUSINESS` permissions and MUST reject every `PLATFORM` permission atomically.

#### Scenario: Add business permission to platform role
- **WHEN** a platform role command includes `business:product:read`
- **THEN** the complete command is rejected before role mutation

#### Scenario: Add tenant administration and business permissions to tenant admin role
- **WHEN** an authorized tenant administrator assigns `tenant:member:read` and `business:product:update` to a `TenantRole`
- **THEN** both permissions are accepted for that tenant role

### Requirement: Tenant role naming is unambiguous across layers
Domain, repository, application, API schema, generated client, and documentation types that represent a tenant-scoped role MUST use the `TenantRole` name; generic `Role` names MUST NOT remain except framework concepts unrelated to AbacusFlow authorization.

#### Scenario: Generate the OpenAPI clients
- **WHEN** the OpenAPI contract is regenerated
- **THEN** tenant role operations consume and return `TenantRole` models
- **AND** platform role operations consume and return `PlatformRole` models
- **AND** stable `/tenant/roles` resource paths remain unchanged
