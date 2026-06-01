import { useState, useCallback, useEffect } from "react";
import type { BasicDepot } from "@abacusflow/core";
import { listDepots } from "../services/depot-service";

/**
 * 仓库列表 hook
 * 封装加载 + 客户端过滤
 */
export function useDepots() {
  const [data, setData] = useState<BasicDepot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDepots();
      setData(res);
    } catch (err) {
      setError("加载失败");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** 客户端过滤 */
  const filtered = searchName
    ? data.filter((d) => d.name.includes(searchName))
    : data;

  return {
    data: filtered,
    loading,
    searchName,
    setSearchName,
    error,
    loadData,
  };
}
