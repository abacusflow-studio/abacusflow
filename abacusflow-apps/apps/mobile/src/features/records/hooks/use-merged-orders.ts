import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import type { OrderRecord } from "../types";
import { fetchMergedRecords } from "../services/records-service";

/**
 * 合并订单记录 hook
 * 封装双 API 调用 + 合并排序 + 无限滚动
 */
export function useMergedOrders() {
  const [records, setRecords] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchRecords = useCallback(async (page: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const result = await fetchMergedRecords(page);
      if (append) {
        setRecords((prev) => [...prev, ...result.records]);
      } else {
        setRecords(result.records);
      }
      setHasMore(result.hasMore);
      setPageIndex(page);
    } catch (err) {
      console.error("Failed to load records:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // 页面获得焦点时刷新
  useFocusEffect(
    useCallback(() => {
      fetchRecords(0, false);
    }, [fetchRecords]),
  );

  /** 加载更多 */
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchRecords(pageIndex + 1, true);
    }
  }, [loadingMore, hasMore, pageIndex, fetchRecords]);

  /** 下拉刷新 */
  const handleRefresh = useCallback(() => {
    fetchRecords(0, false);
  }, [fetchRecords]);

  return {
    records,
    loading,
    loadingMore,
    hasMore,
    handleLoadMore,
    handleRefresh,
  };
}
