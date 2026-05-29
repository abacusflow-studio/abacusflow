"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { message } from "antd";
import type { PageResponse } from "@abacusflow/core";

interface UsePaginatedListOptions<T, F> {
  fetchFn: (params: F) => Promise<PageResponse<T>>;
  defaultPageSize?: number;
  defaultFilters?: Partial<F>;
}

interface UsePaginatedListReturn<T, F> {
  data: T[];
  loading: boolean;
  pageIndex: number;
  pageSize: number;
  total: number;
  filters: Partial<F>;
  setPageIndex: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Partial<F>) => void;
  updateFilter: (key: keyof F, value: F[keyof F] | undefined) => void;
  refresh: () => void;
  handleSearch: () => void;
  handleReset: () => void;
}

export function usePaginatedList<T, F extends object>({
  fetchFn,
  defaultPageSize = 10,
  defaultFilters = {},
}: UsePaginatedListOptions<T, F>): UsePaginatedListReturn<T, F> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Partial<F>>(defaultFilters);

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFnRef.current({
        pageIndex,
        pageSize,
        ...filters,
      } as F);
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      console.error(err);
      message.error(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilter = useCallback(
    (key: keyof F, value: F[keyof F] | undefined) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSearch = useCallback(() => {
    setPageIndex(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilters(defaultFilters);
    setPageIndex(1);
  }, [defaultFilters]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    pageIndex,
    pageSize,
    total,
    filters,
    setPageIndex,
    setPageSize,
    setFilters,
    updateFilter,
    refresh,
    handleSearch,
    handleReset,
  };
}
