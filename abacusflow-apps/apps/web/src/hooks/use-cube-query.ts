"use client";

import { useEffect, useState } from "react";
import { getConfig } from "@abacusflow/config";
import { getAuthClient, getCurrentTenantId } from "@abacusflow/core";
import {
  cubeRequestCoordinator,
  type CubeTokenLease,
} from "../lib/cube-request-coordinator";

export interface CubeTimeDimension {
  dimension: string;
  granularity?: "day" | "week" | "month" | "quarter" | "year";
  dateRange?: string | [string, string];
}

export interface CubeQuery {
  measures?: string[];
  dimensions?: string[];
  timeDimensions?: CubeTimeDimension[];
  filters?: { member: string; operator: string; values?: string[] }[];
  order?: Record<string, "asc" | "desc">;
  limit?: number;
}

export interface CubeQueryResult<T = Record<string, string | number | null>> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export function useCubeQuery<T = Record<string, string | number | null>>(
  query: CubeQuery,
): CubeQueryResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tenantId = getCurrentTenantId();
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    const load = async () => {
      if (tenantId === null) throw new Error("请先选择租户");
      const config = getConfig();
      const cubeToken = await cubeRequestCoordinator.getToken(
        tenantId,
        async (): Promise<CubeTokenLease> => {
          const accessToken = await getAuthClient().getAccessToken();
          const tokenResponse = await fetch(
            `${config.apiBaseUrl.replace(/\/+$/, "")}/api/cube-token`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-Tenant-Id": tenantId.toString(),
              },
            },
          );
          if (!tokenResponse.ok) {
            throw new Error(`Cube Token 请求失败 (${tokenResponse.status})`);
          }
          return (await tokenResponse.json()) as CubeTokenLease;
        },
      );

      return cubeRequestCoordinator.runQuery(async () => {
        const res = await fetch(`${config.cubeEndpoint}/v1/load`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cubeToken}`,
          },
          signal: abortController.signal,
          body: JSON.stringify({ query: JSON.parse(queryKey) as CubeQuery }),
        });
        if (!res.ok) throw new Error(`Cube.js 请求失败 (${res.status})`);
        return res.json() as Promise<{ data: T[]; error?: string }>;
      });
    };

    load()
      .then((json) => {
        if (json.error) throw new Error(json.error);
        if (!cancelled) {
          setData(json.data ?? []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "数据加载失败");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [queryKey, tenantId]);

  return { data, loading, error };
}
