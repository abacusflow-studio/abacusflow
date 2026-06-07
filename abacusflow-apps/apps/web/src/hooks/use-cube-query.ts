"use client";

import { useEffect, useState } from "react";
import { getConfig } from "@abacusflow/config";

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const endpoint = `${getConfig().cubeEndpoint}/v1/load`;

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Cube.js 请求失败 (${res.status})`);
        return res.json() as Promise<{ data: T[]; error?: string }>;
      })
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  return { data, loading, error };
}
