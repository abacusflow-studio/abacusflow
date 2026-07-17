'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface AuthContextType {
  platformPermissions: string[];
  tenantPermissions: string[];
  isAuthenticated: boolean;
  displayName: string;
  setAuthData: (data: {
    platformPermissions: string[];
    tenantPermissions: string[];
    displayName?: string;
  }) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  platformPermissions: [],
  tenantPermissions: [],
  isAuthenticated: false,
  displayName: '',
  setAuthData: () => {},
  clearAuth: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [platformPermissions, setPlatformPermissions] = useState<string[]>([]);
  const [tenantPermissions, setTenantPermissions] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState('');

  const setAuthData = useCallback(
    (data: {
      platformPermissions: string[];
      tenantPermissions: string[];
      displayName?: string;
    }) => {
      setPlatformPermissions(data.platformPermissions);
      setTenantPermissions(data.tenantPermissions);
      if (data.displayName !== undefined) {
        setDisplayName(data.displayName);
      }
    },
    [],
  );

  const clearAuth = useCallback(() => {
    setPlatformPermissions([]);
    setTenantPermissions([]);
    setDisplayName('');
  }, []);

  const isAuthenticated = platformPermissions.length > 0 || tenantPermissions.length > 0;

  return (
    <AuthContext.Provider
      value={{
        platformPermissions,
        tenantPermissions,
        isAuthenticated,
        displayName,
        setAuthData,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
