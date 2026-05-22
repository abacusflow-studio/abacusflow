# Findings

- The shared API client builds URLs as `${config.apiBaseUrl}${path}`.
- Shared config defaults `NEXT_PUBLIC_API_BASE_URL` to `/api`, so Web calls default to paths such as `/api/products`.
- Web middleware allows `/api` paths through, but that does not itself proxy or implement them.
- `apps/web/next.config.ts` sets `output: "export"` and has no rewrite/proxy entry for `/api`.
- Backend OpenAPI declares the local server as `http://localhost:8080` and resource paths such as `/products` and `/inventories` without `/api`.
- Kotlin controllers implement OpenAPI generated APIs and do not add a controller-level `/api` prefix.
- Backend `WebConfig` has static resource setup only; no CORS rule is present there.
- Backend security currently requires authentication for any non-static/non-login request.
- Generated OpenAPI route mappings show additional shared client mismatches:
  - product categories use `/product-categories`, not `/products/categories`.
  - customers and suppliers use `/customers` and `/suppliers`, not `/partners/...`.
  - purchase and sale orders use `/purchase-orders` and `/sale-orders`, not `/transactions/...`.
  - inventory unit depot assignment uses `/inventory-units/{id}/assign-depot`; inventory warning line adjustment uses `/inventories/{id}/adjust-warning-line`.
- Next documentation describes rewrites as URL proxies, while static export does not support rewrites/custom routes; the Web fix should keep `output: "export"` out of development config and use the proxy only where Next dev can serve it.
- The development proxy target defaults to `http://localhost:8080` and can be overridden with `ABACUSFLOW_API_PROXY_TARGET`.
- Production static export still needs an external `/api` routing strategy because a static export cannot supply a Next rewrite itself.
