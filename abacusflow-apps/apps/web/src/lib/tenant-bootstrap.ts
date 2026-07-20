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
