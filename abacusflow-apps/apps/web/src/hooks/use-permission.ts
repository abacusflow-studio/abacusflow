'use client';

import { useAuth } from '../components/auth-provider';
import { useTenant } from '../components/tenant-provider';

export function usePermission() {
  const { platformPermissions } = useAuth();
  const { currentTenant } = useTenant();

  const hasPlatformPermission = (name: string): boolean =>
    platformPermissions.includes(name);

  const hasTenantPermission = (name: string): boolean =>
    currentTenant?.permissionNames?.includes(name) ?? false;

  const hasAnyPlatformPermission = (...names: string[]): boolean =>
    names.some((n) => platformPermissions.includes(n));

  const hasAnyTenantPermission = (...names: string[]): boolean =>
    names.some((n) => currentTenant?.permissionNames?.includes(n) ?? false);

  return {
    hasPlatformPermission,
    hasTenantPermission,
    hasAnyPlatformPermission,
    hasAnyTenantPermission,
  };
}
