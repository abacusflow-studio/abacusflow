import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import type { BasicCustomer, BasicSupplier } from "@abacusflow/core";
import {
  listCustomersPage,
  listSuppliersPage,
} from "../services/partner-service";

const PAGE_SIZE = 20;

/**
 * 客户分页列表 hook
 */
export function useCustomers() {
  const [data, setData] = useState<BasicCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [query, setQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (page: number, append: boolean, keyword: string) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const res = await listCustomersPage({
          pageIndex: page,
          pageSize: PAGE_SIZE,
          name: keyword || undefined,
        });
        setData((prev) =>
          append ? [...prev, ...(res.content ?? [])] : (res.content ?? []),
        );
        setTotal(res.totalElements ?? 0);
        setPageIndex(page);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData(1, false, query);
    }, [loadData, query]),
  );

  const handleSearch = useCallback(() => {
    const nextQuery = searchName.trim();
    setQuery(nextQuery);
    setPageIndex(1);
    if (nextQuery === query) {
      void loadData(1, false, nextQuery);
    }
  }, [loadData, query, searchName]);

  const handleRefresh = useCallback(() => {
    void loadData(1, false, query);
  }, [loadData, query]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && total > pageIndex * PAGE_SIZE) {
      void loadData(pageIndex + 1, true, query);
    }
  }, [loadData, loading, loadingMore, pageIndex, query, total]);

  return {
    data,
    loading,
    loadingMore,
    searchName,
    setSearchName,
    pageIndex,
    total,
    handleSearch,
    handleRefresh,
    handleLoadMore,
    hasMore: total > pageIndex * PAGE_SIZE,
  };
}

/**
 * 供应商分页列表 hook
 */
export function useSuppliers() {
  const [data, setData] = useState<BasicSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [query, setQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (page: number, append: boolean, keyword: string) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const res = await listSuppliersPage({
          pageIndex: page,
          pageSize: PAGE_SIZE,
          name: keyword || undefined,
        });
        setData((prev) =>
          append ? [...prev, ...(res.content ?? [])] : (res.content ?? []),
        );
        setTotal(res.totalElements ?? 0);
        setPageIndex(page);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData(1, false, query);
    }, [loadData, query]),
  );

  const handleSearch = useCallback(() => {
    const nextQuery = searchName.trim();
    setQuery(nextQuery);
    setPageIndex(1);
    if (nextQuery === query) {
      void loadData(1, false, nextQuery);
    }
  }, [loadData, query, searchName]);

  const handleRefresh = useCallback(() => {
    void loadData(1, false, query);
  }, [loadData, query]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && total > pageIndex * PAGE_SIZE) {
      void loadData(pageIndex + 1, true, query);
    }
  }, [loadData, loading, loadingMore, pageIndex, query, total]);

  return {
    data,
    loading,
    loadingMore,
    searchName,
    setSearchName,
    pageIndex,
    total,
    handleSearch,
    handleRefresh,
    handleLoadMore,
    hasMore: total > pageIndex * PAGE_SIZE,
  };
}
