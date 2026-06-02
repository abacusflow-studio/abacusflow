import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import type { BasicDepot } from "@abacusflow/core";
import { listDepots } from "../services/depot-service";

const PAGE_SIZE = 20;

/**
 * 仓库列表 hook
 * 封装加载 + 客户端过滤 + 本地分页
 */
export function useDepots() {
  const [data, setData] = useState<BasicDepot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDepots();
      setData(res);
      setPageIndex(1);
    } catch (err) {
      setError("加载失败");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleSearchNameChange = useCallback((value: string) => {
    setSearchName(value);
    setPageIndex(1);
  }, []);

  const filtered = useMemo(() => {
    const query = searchName.trim().toLowerCase();
    if (!query) return data;
    return data.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        (d.location && d.location.toLowerCase().includes(query)),
    );
  }, [data, searchName]);

  const visibleData = useMemo(
    () => filtered.slice(0, pageIndex * PAGE_SIZE),
    [filtered, pageIndex],
  );

  const hasMore = visibleData.length < filtered.length;

  const handleLoadMore = useCallback(() => {
    if (hasMore) {
      setPageIndex((value) => value + 1);
    }
  }, [hasMore]);

  return {
    data: visibleData,
    loading,
    loadingMore: false,
    searchName,
    setSearchName: handleSearchNameChange,
    error,
    loadData,
    handleRefresh: loadData,
    handleLoadMore,
    hasMore,
  };
}
