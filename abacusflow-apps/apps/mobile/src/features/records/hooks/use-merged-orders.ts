import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { showToast } from "@hooks/use-toast";
import type { OrderRecord, OrderSearchField, OrderType } from "../types";
import { fetchPurchaseRecords, fetchSaleRecords } from "../services/records-service";

export type OrderFilter = OrderType;

/**
 * 订单记录 hook
 * 按类型（入库/出库）独立拉取，支持切换 + 分页
 * pageIndex 从 1 开始（与后端一致）
 */
export function useOrderRecords() {
  const [filter, setFilter] = useState<OrderFilter>("sale");
  const [records, setRecords] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchField, setSearchField] = useState<OrderSearchField>("partner");
  const [searchQueryField, setSearchQueryField] =
    useState<OrderSearchField>("partner");

  const fetchFn = filter === "purchase" ? fetchPurchaseRecords : fetchSaleRecords;

  const fetchRecords = useCallback(
    async (page: number, append: boolean, keyword: string) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const result = await fetchFn(page, keyword, searchQueryField);
        if (append) {
          setRecords((prev) => [...prev, ...result.records]);
        } else {
          setRecords(result.records);
        }
        setHasMore(result.hasMore);
        setPageIndex(page);
      } catch (err) {
        console.error("Failed to load records:", err);
        showToast(err instanceof Error ? err.message : "加载订单失败", "error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [fetchFn, searchQueryField],
  );

  // 切换类型时重置并重新拉取
  const handleFilterChange = useCallback(
    (newFilter: OrderFilter) => {
      if (newFilter === filter) return;
      setFilter(newFilter);
      setRecords([]);
      setPageIndex(1);
      setHasMore(true);
      setLoading(true);
    },
    [filter],
  );

  const handleSearch = useCallback(() => {
    const nextKeyword = searchValue.trim();
    setSearchKeyword(nextKeyword);
    setSearchQueryField(searchField);
    setPageIndex(1);
    setHasMore(true);
    setLoading(true);
  }, [searchField, searchValue]);

  const handleClearSearch = useCallback(() => {
    setSearchValue("");
    setSearchKeyword("");
    setPageIndex(1);
    setHasMore(true);
    setLoading(true);
  }, []);

  // filter 变化后拉取数据
  useFocusEffect(
    useCallback(() => {
      fetchRecords(1, false, searchKeyword);
    }, [fetchRecords, searchKeyword]),
  );

  /** 触底加载下一页 */
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchRecords(pageIndex + 1, true, searchKeyword);
    }
  }, [loadingMore, hasMore, pageIndex, fetchRecords, searchKeyword]);

  /** 下拉刷新 */
  const handleRefresh = useCallback(() => {
    fetchRecords(1, false, searchKeyword);
  }, [fetchRecords, searchKeyword]);

  return {
    records,
    loading,
    loadingMore,
    hasMore,
    filter,
    searchValue,
    searchKeyword,
    searchField,
    setSearchValue,
    setFilter: handleFilterChange,
    setSearchField,
    handleSearch,
    handleClearSearch,
    handleLoadMore,
    handleRefresh,
  };
}
