## 1. Confirm the baseline and affected contracts

- [x] 1.1 Reconfirm that V001/V002 have not entered a shared environment requiring data preservation; if they have, stop baseline edits and design the next forward-only migration instead.
- [x] 1.2 Inventory every persisted-root assumption across Flyway SQL, Kotlin domain/use cases, OpenAPI/generated clients, Web/mobile sources, tests and documentation, including every comparison with the literal `根节点`.
- [x] 1.3 Record the final contract: create `parentId` is optional nullable; PUT update requires `name` and requires nullable `parentId`; API responses contain only real categories.

## 2. Simplify the fresh database baseline

- [x] 2.1 Change the V001 product-category uniqueness rule to portable tenant-wide `UNIQUE (tenant_id, name)` and remove the `(tenant_id, parent_id, name)` constraint and PostgreSQL partial root-name index.
- [x] 2.2 Remove the persisted product-category root INSERT from V002 and ensure seed/identity sequence handling remains valid when `product_category` starts empty.
- [x] 2.3 Extend the fresh-baseline Testcontainers test to prove only V001/V002 apply, the default tenant has zero product categories, duplicate names fail within one tenant, and the same name succeeds in different tenants under the correct tenant/RLS contexts.

## 3. Implement real-category forest semantics

- [x] 3.1 Change `ProductCategory` hierarchy behavior to allow a null parent and provide one atomic move method that rejects self-parenting, cross-tenant parents and moves below any descendant.
- [x] 3.2 Add repository operations for tenant-filtered name-conflict checks excluding the current category and for detecting direct child references before deletion.
- [x] 3.3 Update create handling so null/omitted `parentId` creates a top-level category and a non-null ID must resolve to a current-tenant real category.
- [x] 3.4 Update PUT handling to apply the complete requested name, description and explicit nullable parent state without treating null as “leave unchanged”.
- [x] 3.5 Reject category deletion when direct children or products reference it, while allowing deletion of an unused leaf.
- [x] 3.6 Add domain and use-case tests for top-level creation, child creation, move to top level, valid branch move, self-parenting, multi-level cycles, cross-tenant parents, duplicate names and deletion protection.

## 4. Update OpenAPI and generated clients

- [x] 4.1 Update Kotlin input TOs and portal mappings so create uses nullable `parentId` and PUT uses a required name plus an explicitly nullable parent.
- [x] 4.2 Update `CreateProductCategoryInput` and `UpdateProductCategoryInput` in OpenAPI, documenting null/omitted create semantics and required-nullable PUT semantics.
- [x] 4.3 Regenerate backend OpenAPI sources and the shared TypeScript client, then update every compile-time consumer without introducing a fake root ID compatibility alias.
- [x] 4.4 Add contract tests proving create permits no parent, update requires a nullable parent property, category responses remain nullable-parent real records, and no virtual-root schema is exposed.

## 5. Replace the Web sentinel with a virtual root

- [x] 5.1 Remove every `name === “根节点”` lookup/protection and build the displayed hierarchy from real categories using null `parentId` as the top-level boundary.
- [x] 5.2 Represent “全部分类” only as a local presentation container with no API ID; ensure create-from-root sends null/omitted `parentId` and child creation sends the selected real category ID.
- [x] 5.3 Update the edit form to submit the complete PUT state and allow moving a category to the top level by sending `parentId: null`.
- [x] 5.4 Ensure product-category selectors contain only real categories and show an actionable empty state when a tenant has no categories.
- [x] 5.5 Add Web tests for an empty catalog, multiple top-level categories, nested categories, create-from-virtual-root, move-to-top-level, and a normal editable category literally named `根节点`.

## 6. Verify and hand off

- [x] 6.1 Run product domain/use-case tests plus relevant tenant-isolation and RLS tests, including crafted cross-tenant parent IDs.
- [x] 6.2 Recreate a PostgreSQL Testcontainers database from V001/V002 and verify no persisted root, portable uniqueness behavior, hierarchy references and identity sequences.
- [x] 6.3 Run OpenAPI generation/contract checks, shared-client checks, Web tests/lint/build, and typecheck any mobile consumer affected by generated type changes.
- [x] 6.4 Scan the repository for the old seed row, root-name sentinels, fabricated root IDs, required create-parent assumptions and PostgreSQL partial root indexes; review every remaining match.
- [x] 6.5 Update product-category architecture/API documentation to state that the database stores a tenant-scoped forest and the UI root is virtual.
- [x] 6.6 Run `git diff --check`, preserve unrelated work in the dirty tree, and obtain review focused on hierarchy cycles, tenant isolation and generated-client compatibility.
