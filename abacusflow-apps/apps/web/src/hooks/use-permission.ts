'use client';

import { useCallback } from 'react';
import { useAuth } from '../components/auth-provider';
import { canPermission } from '../lib/menu-registry';

export function usePermission() {
  const { platformPermissions, tenantPermissions } = useAuth();

  const can = useCallback(
    (permission: string): boolean =>
      canPermission(permission, {
        platformPermissions,
        tenantPermissions,
      }),
    [platformPermissions, tenantPermissions],
  );

  return { can };
}
