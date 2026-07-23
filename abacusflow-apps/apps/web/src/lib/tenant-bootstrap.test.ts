import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveInvitationOnboardingState,
  resolveBootstrapTenantId,
  shouldShowPendingInvitations,
} from "./tenant-bootstrap.ts";

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

test("pending invitations are shown as soon as at least one matching invitation exists", () => {
  assert.equal(shouldShowPendingInvitations(0), false);
  assert.equal(shouldShowPendingInvitations(1), true);
  assert.equal(shouldShowPendingInvitations(3), true);
});

test("an unverified login email must be verified before invitations are disclosed", () => {
  assert.equal(resolveInvitationOnboardingState(false, 0), "VERIFY_EMAIL");
  assert.equal(resolveInvitationOnboardingState(false, 2), "VERIFY_EMAIL");
  assert.equal(
    resolveInvitationOnboardingState(true, 2),
    "PENDING_INVITATIONS",
  );
  assert.equal(
    resolveInvitationOnboardingState(true, 0),
    "NO_PENDING_INVITATIONS",
  );
});
