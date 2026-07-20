## ADDED Requirements

### Requirement: The database stores only real product categories
The system MUST NOT persist a synthetic product-category root record, and a tenant MUST be valid with zero product categories.

#### Scenario: Initialize the default tenant
- **WHEN** Flyway initializes a fresh database
- **THEN** no `product_category` row named or designated as a system root is inserted
- **AND** the default tenant has zero product categories until a user creates one

#### Scenario: Provision a new tenant
- **WHEN** a platform administrator provisions a tenant
- **THEN** tenant provisioning completes without creating any product-category row
- **AND** the tenant can later create its first top-level category

### Requirement: Categories form a tenant-scoped forest
The system MUST represent a top-level real category with a null parent and MUST represent a child category with the ID of a real category from the same tenant.

#### Scenario: Create a top-level category
- **WHEN** an authorized caller creates a category with `parentId` omitted or null
- **THEN** the category is stored with `parent_id = NULL`
- **AND** it is returned as a real top-level category

#### Scenario: Create a child category
- **WHEN** an authorized caller creates a category with the ID of a current-tenant category
- **THEN** the new category is stored as a child of that category

#### Scenario: Use a category from another tenant as parent
- **WHEN** a caller submits a parent ID belonging to another tenant
- **THEN** the complete command is rejected as if the parent were unavailable
- **AND** no category is created or moved

### Requirement: Category moves preserve an acyclic hierarchy
The update contract MUST express the complete desired parent state and the system MUST reject any move that creates a self-reference or ancestor cycle.

#### Scenario: Move a category to the top level
- **WHEN** an authorized caller sends an update with required `parentId` explicitly set to null
- **THEN** the category parent becomes null
- **AND** its other descendants remain attached

#### Scenario: Move a category below another branch
- **WHEN** an authorized caller sends an update with the ID of a valid current-tenant parent
- **THEN** the category moves below that parent

#### Scenario: Make a category its own parent
- **WHEN** an update uses the category's own ID as `parentId`
- **THEN** the system rejects the complete update

#### Scenario: Move a category below its descendant
- **GIVEN** category B is a descendant of category A
- **WHEN** an update attempts to make B the parent of A
- **THEN** the system rejects the complete update
- **AND** the existing hierarchy remains unchanged

### Requirement: Product-category names are unique within a tenant
The system MUST enforce category-name uniqueness across the entire current tenant and MUST allow a different tenant to use the same name.

#### Scenario: Duplicate name in one tenant
- **WHEN** a create or rename command uses a name already held by another category in the current tenant
- **THEN** the operation is rejected

#### Scenario: Same name in different tenants
- **WHEN** tenant A and tenant B each create a category named `食品`
- **THEN** both categories are accepted and remain isolated

### Requirement: Category deletion preserves references
The system MUST reject deleting a category while any direct child category or product references it.

#### Scenario: Delete a category with children
- **WHEN** an authorized caller deletes a category that has at least one direct child
- **THEN** deletion is rejected with a category-hierarchy error
- **AND** the hierarchy remains unchanged

#### Scenario: Delete a category used by products
- **WHEN** an authorized caller deletes a category referenced by at least one product
- **THEN** deletion is rejected
- **AND** every product retains its category

#### Scenario: Delete an unused leaf category
- **WHEN** an authorized caller deletes a category with no children and no product references
- **THEN** the real category is deleted

### Requirement: The Web presents a non-persisted virtual root
The Web MUST be able to wrap all real top-level categories in a virtual display root without treating that root as API data.

#### Scenario: Display multiple top-level categories
- **WHEN** the API returns multiple categories with null `parentId`
- **THEN** the Web displays them beneath one virtual `全部分类` root or equivalent page container
- **AND** no persisted root record is required

#### Scenario: Create from the virtual root
- **WHEN** a user creates a category while the virtual root is selected
- **THEN** the Web sends null or omitted `parentId`
- **AND** it never sends a fabricated root ID

#### Scenario: Select a product category
- **WHEN** a user chooses a category for a product
- **THEN** only real category IDs are selectable
- **AND** the virtual root cannot be assigned to the product

#### Scenario: Category name equals the former sentinel
- **WHEN** a real category is named `根节点`
- **THEN** the Web treats it as an ordinary category according to its `parentId`
- **AND** no edit or delete behavior depends on that name
