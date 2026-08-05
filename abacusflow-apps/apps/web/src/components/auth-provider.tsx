"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface AuthContextType {
  platformPermissions: string[];
  platformRoles: string[];
  tenantPermissions: string[];
  isAuthenticated: boolean;
  displayName: string;
  setAuthData: (data: {
    platformPermissions: string[];
    platformRoles?: string[];
    tenantPermissions: string[];
    displayName?: string;
  }) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  platformPermissions: [],
  platformRoles: [],
  tenantPermissions: [],
  isAuthenticated: false,
  displayName: "",
  setAuthData: () => {},
  clearAuth: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [platformPermissions, setPlatformPermissions] = useState<string[]>([]);
  const [platformRoles, setPlatformRoles] = useState<string[]>([]);
  const [tenantPermissions, setTenantPermissions] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const setAuthData = useCallback(
    (data: {
      platformPermissions: string[];
      platformRoles?: string[];
      tenantPermissions: string[];
      displayName?: string;
    }) => {
      setPlatformPermissions(data.platformPermissions);
      setPlatformRoles(data.platformRoles ?? []);
      setTenantPermissions(data.tenantPermissions);
      if (data.displayName !== undefined) {
        setDisplayName(data.displayName);
      }
      setIsAuthenticated(true);
    },
    [],
  );

  const clearAuth = useCallback(() => {
    setPlatformPermissions([]);
    setPlatformRoles([]);
    setTenantPermissions([]);
    setDisplayName("");
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        platformPermissions,
        platformRoles,
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
