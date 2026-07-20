import assert from "node:assert/strict";
import test from "node:test";
import { filterMenuRegistry, firstVisibleRoute, type PermissionSnapshot } from "./menu-registry.ts";

function visibleRoutes(snapshot: PermissionSnapshot): string[] {
  const collect = (entries: ReturnType<typeof filterMenuRegistry>): string[] =>
    entries.flatMap((entry) => [
      ...(entry.route ? [entry.route] : []),
      ...(entry.children ? collect([...entry.children]) : []),
    ]);
  return collect(filterMenuRegistry(snapshot));
}

test("no-tenant invited user sees no protected navigation", () => {
  const entries = filterMenuRegistry({ platformPermissions: [], tenantPermissions: [] });
  assert.deepEqual(entries, []);
  assert.equal(firstVisibleRoute(entries), null);
});

test("business-only member sees only granted business navigation", () => {
  const routes = visibleRoutes({
    platformPermissions: [],
    tenantPermissions: ["business:product:read"],
  });
  assert.deepEqual(routes, ["/products"]);
});

test("tenant administrator sees tenant administration without platform navigation", () => {
  const routes = visibleRoutes({
    platformPermissions: [],
    tenantPermissions: ["tenant:profile:read", "tenant:member:read", "tenant:role:read"],
  });
  assert.deepEqual(routes, ["/tenant", "/tenant/members", "/tenant/roles"]);
});

test("platform-only administrator sees platform navigation without tenant membership", () => {
  const routes = visibleRoutes({
    platformPermissions: ["platform:tenant:list", "platform:role:read"],
    tenantPermissions: [],
  });
  assert.deepEqual(routes, ["/platform/tenants", "/platform/roles"]);
});

test("combined platform and multi-tenant user uses only the selected tenant grants", () => {
  const routes = visibleRoutes({
    platformPermissions: ["platform:tenant:list"],
    tenantPermissions: ["business:sale-order:read", "tenant:member:read"],
  });
  assert.deepEqual(routes, ["/transaction/sale-order", "/platform/tenants", "/tenant/members"]);
  assert.equal(routes.includes("/products"), false);
});
