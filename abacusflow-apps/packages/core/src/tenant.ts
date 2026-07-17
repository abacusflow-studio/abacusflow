// Tenant context management for the frontend

const TENANT_STORAGE_KEY = 'abacusflow_current_tenant_id';

export interface TenantInfo {
  tenantId: number;
  name: string;
  displayName?: string | null;
  roleNames: string[];
  permissionNames: string[];
}

export interface TenantContextState {
  tenantStatus: 'NEEDS_ONBOARDING' | 'SINGLE_TENANT' | 'MULTI_TENANT';
  tenants: TenantInfo[];
  currentTenantId: number | null;
}

// ---- Pluggable tenant storage ----
// Mobile (React Native) uses SecureStore which is async,
// so we use an in-memory cache + async setter pattern.

interface TenantStorage {
  get(): number | null;
  set(tenantId: number | null): void;
}

const localStorageAdapter: TenantStorage = {
  get(): number | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(TENANT_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  },
  set(tenantId: number | null): void {
    if (typeof window === 'undefined') return;
    if (tenantId !== null) {
      localStorage.setItem(TENANT_STORAGE_KEY, tenantId.toString());
    } else {
      localStorage.removeItem(TENANT_STORAGE_KEY);
    }
  },
};

let tenantStorage: TenantStorage = localStorageAdapter;

// In-memory cache for mobile (set synchronously after async load)
let memoryTenantId: number | null = null;

/**
 * Set a custom tenant storage adapter (e.g., for React Native SecureStore).
 * Call this before any tenant operations on mobile.
 */
export function setTenantStorage(storage: TenantStorage): void {
  tenantStorage = storage;
}

/**
 * Set the in-memory tenant ID directly (used by mobile after async SecureStore read).
 * This is the value used by getCurrentTenantId() for API header injection.
 */
export function setMemoryTenantId(tenantId: number | null): void {
  memoryTenantId = tenantId;
}

// Get stored tenant ID (from storage adapter)
export function getStoredTenantId(): number | null {
  // Prefer in-memory cache (set by mobile after async load)
  if (memoryTenantId !== null) return memoryTenantId;
  return tenantStorage.get();
}

// Store tenant ID
export function setStoredTenantId(tenantId: number | null): void {
  memoryTenantId = tenantId;
  tenantStorage.set(tenantId);
}

// Get current tenant ID (for API headers)
export function getCurrentTenantId(): number | null {
  return getStoredTenantId();
}

// Clear tenant context (on logout or switch)
export function clearTenantContext(): void {
  setStoredTenantId(null);
}
