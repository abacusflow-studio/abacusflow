import { useState, useCallback, useEffect } from "react";
import type { BasicCustomer, BasicSupplier } from "@abacusflow/core";
import {
  listCustomersPage,
  listSuppliersPage,
} from "../services/partner-service";

/**
 * 客户分页列表 hook
 */
export function useCustomers() {
  const [data, setData] = useState<BasicCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (page = pageIndex) => {
      setLoading(true);
      try {
        const res = await listCustomersPage({
          pageIndex: page,
          pageSize: 20,
          name: searchName || undefined,
        });
        setData(res.content);
        setTotal(res.totalElements);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [pageIndex, searchName],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = useCallback(() => {
    setPageIndex(1);
    loadData(1);
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setPageIndex(1);
    loadData(1);
  }, [loadData]);

  const handleLoadMore = useCallback(() => {
    setPageIndex((p) => p + 1);
  }, []);

  return {
    data,
    loading,
    searchName,
    setSearchName,
    pageIndex,
    total,
    handleSearch,
    handleRefresh,
    handleLoadMore,
    hasMore: total > pageIndex * 20,
  };
}

/**
 * 供应商分页列表 hook
 */
export function useSuppliers() {
  const [data, setData] = useState<BasicSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (page = pageIndex) => {
      setLoading(true);
      try {
        const res = await listSuppliersPage({
          pageIndex: page,
          pageSize: 20,
          name: searchName || undefined,
        });
        setData(res.content);
        setTotal(res.totalElements);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [pageIndex, searchName],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = useCallback(() => {
    setPageIndex(1);
    loadData(1);
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setPageIndex(1);
    loadData(1);
  }, [loadData]);

  const handleLoadMore = useCallback(() => {
    setPageIndex((p) => p + 1);
  }, []);

  return {
    data,
    loading,
    searchName,
    setSearchName,
    pageIndex,
    total,
    handleSearch,
    handleRefresh,
    handleLoadMore,
    hasMore: total > pageIndex * 20,
  };
}
