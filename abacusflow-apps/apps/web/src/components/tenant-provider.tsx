"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  TenantInfo,
  getStoredTenantId,
  setStoredTenantId,
  clearTenantContext,
} from "@abacusflow/core";

interface TenantContextType {
  tenantStatus:
    | "NEEDS_ONBOARDING"
    | "SINGLE_TENANT"
    | "MULTI_TENANT"
    | "LOADING";
  tenants: TenantInfo[];
  currentTenantId: number | null;
  currentTenant: TenantInfo | null;
  selectTenant: (tenantId: number) => void;
  setBootstrapData: (
    status: string,
    tenants: TenantInfo[],
    autoSelectId?: number | null,
  ) => void;
  updateTenantInList: (tenantId: number, updates: Partial<TenantInfo>) => void;
  clearTenant: () => void;
}

const TenantContext = createContext<TenantContextType>({
  tenantStatus: "LOADING",
  tenants: [],
  currentTenantId: null,
  currentTenant: null,
  selectTenant: () => {},
  setBootstrapData: () => {},
  updateTenantInList: () => {},
  clearTenant: () => {},
});

export function useTenant() {
  return useContext(TenantContext);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantStatus, setTenantStatus] =
    useState<TenantContextType["tenantStatus"]>("LOADING");
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<number | null>(
    getStoredTenantId(),
  );

  const selectTenant = useCallback(
    (tenantId: number) => {
      if (!tenants.some((tenant) => tenant.tenantId === tenantId)) {
        throw new Error(
          `Tenant ${tenantId} is not available to the current user`,
        );
      }
      setCurrentTenantId(tenantId);
      setStoredTenantId(tenantId);
    },
    [tenants],
  );

  const setBootstrapData = useCallback(
    (
      status: string,
      tenantList: TenantInfo[],
      autoSelectId?: number | null,
    ) => {
      const validStatus = status as TenantContextType["tenantStatus"];
      setTenantStatus(
        validStatus === "LOADING" ? "NEEDS_ONBOARDING" : validStatus,
      );
      setTenants(tenantList);

      const candidateId =
        autoSelectId === undefined ? getStoredTenantId() : autoSelectId;
      const validatedId = tenantList.some(
        (tenant) => tenant.tenantId === candidateId,
      )
        ? candidateId
        : null;
      setCurrentTenantId(validatedId);
      setStoredTenantId(validatedId);
    },
    [],
  );

  const clearTenant = useCallback(() => {
    setTenantStatus("LOADING");
    setTenants([]);
    setCurrentTenantId(null);
    clearTenantContext();
  }, []);

  const updateTenantInList = useCallback(
    (tenantId: number, updates: Partial<TenantInfo>) => {
      setTenants((prev) =>
        prev.map((t) => (t.tenantId === tenantId ? { ...t, ...updates } : t)),
      );
    },
    [],
  );

  const currentTenant =
    tenants.find((t) => t.tenantId === currentTenantId) || null;

  return (
    <TenantContext.Provider
      value={{
        tenantStatus,
        tenants,
        currentTenantId,
        currentTenant,
        selectTenant,
        setBootstrapData,
        updateTenantInList,
        clearTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}
