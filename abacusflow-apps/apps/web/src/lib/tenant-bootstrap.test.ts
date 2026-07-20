import assert from "node:assert/strict";
import test from "node:test";
import { resolveBootstrapTenantId } from "./tenant-bootstrap.ts";

test("a single active membership replaces a stale cached tenant", () => {
  assert.equal(
    resolveBootstrapTenantId("SINGLE_TENANT", [{ tenantId: 200 }], 100),
    200,
  );
});

test("a valid cached membership is restored for a multi-tenant user", () => {
  assert.equal(
    resolveBootstrapTenantId(
      "MULTI_TENANT",
      [{ tenantId: 100 }, { tenantId: 200 }],
      200,
    ),
    200,
  );
});

test("a stale cached membership is rejected for a multi-tenant user", () => {
  assert.equal(
    resolveBootstrapTenantId(
      "MULTI_TENANT",
      [{ tenantId: 200 }, { tenantId: 300 }],
      100,
    ),
    null,
  );
});
