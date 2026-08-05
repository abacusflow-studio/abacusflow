export interface BootstrapTenant {
  tenantId: number;
}

export function resolveBootstrapTenantId(
  status: string,
  tenants: readonly BootstrapTenant[],
  storedTenantId: number | null,
): number | null {
  if (status === "SINGLE_TENANT") {
    return tenants[0]?.tenantId ?? null;
  }

  if (
    storedTenantId !== null &&
    Number.isSafeInteger(storedTenantId) &&
    tenants.some((tenant) => tenant.tenantId === storedTenantId)
  ) {
    return storedTenantId;
  }

  return null;
}

export function shouldShowPendingInvitations(
  pendingInvitationCount: number,
): boolean {
  return (
    Number.isSafeInteger(pendingInvitationCount) && pendingInvitationCount > 0
  );
}

export type InvitationOnboardingState =
  | "VERIFY_EMAIL"
  | "PENDING_INVITATIONS"
  | "NO_PENDING_INVITATIONS";

export function resolveInvitationOnboardingState(
  emailVerified: boolean,
  pendingInvitationCount: number,
): InvitationOnboardingState {
  if (!emailVerified) {
    return "VERIFY_EMAIL";
  }

  return shouldShowPendingInvitations(pendingInvitationCount)
    ? "PENDING_INVITATIONS"
    : "NO_PENDING_INVITATIONS";
}
