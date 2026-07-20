## MODIFIED Requirements

### Requirement: Web navigation derives from current backend grants
The Web application MUST build platform navigation from `/me` platform permissions and current-tenant/business navigation from the selected membership permissions using one menu registry.

#### Scenario: Database role assignment changes
- **WHEN** a role-permission assignment is changed and the user refreshes authentication/bootstrap state
- **THEN** the navigation reflects the new `/me` permission lists
- **AND** no independent frontend role mapping needs to change

#### Scenario: Platform administrator has no tenant membership
- **WHEN** `/me` returns platform permissions and no tenant membership
- **THEN** authorized platform menu entries are visible
- **AND** tenant and business menu entries are absent

### Requirement: Frontend permission checks are presentation only
Frontend menu, page, and action checks MUST be treated as usability behavior; backend authorization MUST remain authoritative for direct URLs and crafted API requests.

#### Scenario: User enters a hidden route directly
- **WHEN** a user manually navigates to a page whose API requires an authority not present in the request
- **THEN** the backend returns 403
- **AND** Web displays the shared forbidden state or notification

#### Scenario: User submits a hidden action manually
- **WHEN** a user crafts a request for a hidden create, update, assign, or delete action
- **THEN** backend method security rejects it
- **AND** frontend route configuration cannot grant the operation

### Requirement: Web does not maintain a duplicate route authorization policy
The Web application MUST remove the standalone route-permission policy and MUST NOT maintain a second endpoint authorization map separate from backend method security.

#### Scenario: Add a new menu entry
- **WHEN** a developer adds a new visible navigation destination
- **THEN** the developer adds its presentation metadata to the single menu registry
- **AND** backend authorization remains declared and tested in the backend operation
