import { getConfig } from "@abacusflow/config";
import { getAuthClient } from "./auth";
import type { TenantInfo } from "./tenant";

function apiUrl(path: string): string {
  return `${getConfig().apiBaseUrl.replace(/\/$/, "")}${path}`;
}

export interface CreateTenantInput {
  name: string;
  displayName?: string;
}

export async function createTenant(input: CreateTenantInput): Promise<TenantInfo> {
  const auth = getAuthClient();
  const token = await auth.getAccessToken();

  const response = await fetch(apiUrl("/tenants"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let msg: string | undefined;
    try {
      const body = await response.clone().json();
      msg = body?.message;
    } catch {
      // non-JSON response
    }
    throw new Error(msg ?? `创建租户失败 (${response.status})`);
  }

  return response.json();
}

export async function listTenants(): Promise<TenantInfo[]> {
  const auth = getAuthClient();
  const token = await auth.getAccessToken();

  const response = await fetch(apiUrl("/tenants"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let msg: string | undefined;
    try {
      const body = await response.clone().json();
      msg = body?.message;
    } catch {
      // non-JSON response
    }
    throw new Error(msg ?? `获取租户列表失败 (${response.status})`);
  }

  return response.json();
}
