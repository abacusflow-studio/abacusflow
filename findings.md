# Findings

- Planning session catchup found an older `DataTable` undefined-data fix in prior context, but the current git worktree is clean.
- Reference app directory exists at `abacusflow-app/abacusflow-webapp`.
- Target web app exists at `abacusflow-apps/apps/web`.
- Existing planning files were for a completed API proxy/path task and have been reset for this webapp migration task.
- Reference app stack is Vue 3 + Vite + Ant Design Vue + `@tanstack/vue-query` + ECharts/Cube.js.
- Target web stack is Next 15 + React 19, with local shared packages `@abacusflow/core`, `@abacusflow/ui`, and `@abacusflow/utils`; no Ant Design dependency is present there.
- Target web already has first-pass pages for dashboard, products, inventory, depots, customers, suppliers, purchase orders, sale orders, and users.
- Migration should therefore fill behavior gaps in the existing Next app instead of replacing the stack with Ant Design.
- OpenAPI confirms several action endpoints are `POST`, not `PUT`: `/inventories/{id}/adjust-warning-line`, `/inventory-units/{id}/assign-depot`, `/purchase-orders/{id}/{complete|cancel|reverse}`, and `/sale-orders/{id}/{complete|cancel|reverse}`.
- The reference product page combines a category tree (`listSelectableProductCategories`) with product list filters (`name`, `type`, `enabled`, `categoryId`) and product create/edit requires `categoryId` and `barcode`.
- Reference includes a separate product category management screen with a tree table backed by `listBasicProductCategories`, plus add/edit/delete category operations.
- Reference inventory page has two data modes: `/inventories` for product-level inventory summaries and `/inventory-units` for unit-level rows. Both share filters `productName`, `depotName`, `productType`, `inventoryUnitCode`; export uses `/inventories/export/{excel|pdf}` with optional `productCategoryId`.
- Reference order pages use richer filters: purchase (`orderNo`, `supplierName`, `status`, `productName`, `serialNumber`, `orderDate`) and sale (`orderNo`, `customerName`, `status`, `inventoryUnitName`, `orderDate`).
- Reference order creation supports multiple `orderItems`; purchase items select products, sale items select inventory units.
- Verification passed for `npm run lint -w abacusflow-web`, `npx tsc --noEmit --project apps/web/tsconfig.json`, `npm run build -w abacusflow-web`, and `git diff --check`.
- Web dev server is running at `http://localhost:3001`; port `3000` was already occupied when checked. The new category route responds with HTTP 200.
