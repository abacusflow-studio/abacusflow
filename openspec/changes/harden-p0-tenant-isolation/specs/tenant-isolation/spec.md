## ADDED Requirements

### Requirement: Tenant administration mutations are tenant-bound
The system MUST resolve membership, invitation, and role mutation targets within the current active tenant and MUST return not found for a resource belonging to another tenant.

#### Scenario: Update another tenant's membership
- **WHEN** a tenant administrator submits a membership ID owned by a different tenant
- **THEN** the system returns not found
- **AND** the target membership and its roles remain unchanged

#### Scenario: Cancel another tenant's invitation
- **WHEN** a tenant administrator submits an invitation ID owned by a different tenant
- **THEN** the system returns not found
- **AND** the invitation remains pending

### Requirement: Business requests require an active tenant context
The system SHALL authorize a selected tenant only when the authenticated user has an active membership and the tenant itself is active.

#### Scenario: Forged tenant header
- **WHEN** a user sends an `X-Tenant-Id` for a tenant where they have no active membership
- **THEN** the system returns forbidden without establishing tenant context

#### Scenario: Suspended tenant
- **WHEN** an otherwise active member selects a suspended tenant
- **THEN** the system returns forbidden without business authorities

### Requirement: PostgreSQL RLS is effective for runtime queries
The production runtime database identity MUST be non-superuser, non-owner, and without `BYPASSRLS`, and business transactions MUST set `app.tenant_id` on their active connection.

#### Scenario: SQL omits tenant predicate
- **WHEN** runtime SQL selects a tenant-scoped table without an explicit tenant condition
- **THEN** PostgreSQL returns only rows for `app.tenant_id`

#### Scenario: Runtime attempts DDL or truncate
- **WHEN** the runtime identity attempts DDL or `TRUNCATE` on a business table
- **THEN** PostgreSQL rejects the operation

### Requirement: Peripheral data paths remain tenant-bound
Scheduled work, files, frontend requests, and Cube analytics MUST retain the selected tenant and MUST NOT expose another tenant's data.

#### Scenario: Scheduled processing
- **WHEN** a scheduled job processes multiple active tenants
- **THEN** each tenant is processed in a separate tenant context and transaction

#### Scenario: File access
- **WHEN** feedback uploads a file
- **THEN** the object key contains the current tenant ID
- **AND** access uses a private short-lived URL

#### Scenario: Cube query
- **WHEN** the Web client queries Cube
- **THEN** it uses a short-lived backend-issued token containing the selected tenant ID
- **AND** Cube appends the matching tenant filter

### Requirement: Inventory concurrency does not oversell
Concurrent reservations or deductions for the same inventory unit MUST serialize or fail atomically without producing a negative available quantity or a committed order without stock.

#### Scenario: Competing sale orders
- **WHEN** two transactions concurrently reserve more combined stock than is available
- **THEN** at most the valid quantity commits
- **AND** no inventory unit has negative available stock
