import { useState, useCallback } from "react";
import type {
  BasicProduct,
  BasicInventory,
  BasicPurchaseOrder,
  BasicSaleOrder,
  BasicCustomer,
  BasicSupplier,
  BasicDepot,
} from "@abacusflow/core";
import { showToast } from "@hooks/use-toast";
import type { LookupMode } from "../types";
import {
  searchProducts,
  searchInventories,
  searchPurchaseOrders,
  searchSaleOrders,
  searchCustomers,
  searchSuppliers,
  searchDepots,
  findInventoriesByBarcode,
} from "../services/lookup-service";

export function useLookupSearch() {
  const [mode, setMode] = useState<LookupMode>("menu");
  const [searchValue, setSearchValue] = useState("");
  const [products, setProducts] = useState<BasicProduct[]>([]);
  const [inventories, setInventories] = useState<BasicInventory[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<BasicPurchaseOrder[]>([]);
  const [saleOrders, setSaleOrders] = useState<BasicSaleOrder[]>([]);
  const [customers, setCustomers] = useState<BasicCustomer[]>([]);
  const [suppliers, setSuppliers] = useState<BasicSupplier[]>([]);
  const [depots, setDepots] = useState<BasicDepot[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const normalizeSearch = (value: string) => value.trim();

  const handleProductSearch = useCallback(
    async (nextValue = searchValue) => {
      const query = normalizeSearch(nextValue);
      if (!query) return;
      setLoading(true);
      setSearched(true);
      try {
        setProducts(await searchProducts(query));
      } catch (err) {
        console.error(err);
        showToast(err instanceof Error ? err.message : "搜索产品失败", "error");
      } finally {
        setLoading(false);
      }
    },
    [searchValue],
  );

  const handleInventorySearch = useCallback(
    async (nextValue = searchValue) => {
      const query = normalizeSearch(nextValue);
      if (!query) return;
      setLoading(true);
      setSearched(true);
      try {
        setInventories(await searchInventories(query));
      } catch (err) {
        console.error(err);
        showToast(err instanceof Error ? err.message : "搜索库存失败", "error");
      } finally {
        setLoading(false);
      }
    },
    [searchValue],
  );

  const handlePurchaseOrderSearch = useCallback(
    async (nextValue = searchValue) => {
      const query = normalizeSearch(nextValue);
      if (!query) return;
      setLoading(true);
      setSearched(true);
      try {
        setPurchaseOrders(await searchPurchaseOrders(query));
      } catch (err) {
        console.error(err);
        showToast(err instanceof Error ? err.message : "搜索采购单失败", "error");
      } finally {
        setLoading(false);
      }
    },
    [searchValue],
  );

  const handleSaleOrderSearch = useCallback(
    async (nextValue = searchValue) => {
      const query = normalizeSearch(nextValue);
      if (!query) return;
      setLoading(true);
      setSearched(true);
      try {
        setSaleOrders(await searchSaleOrders(query));
      } catch (err) {
        console.error(err);
        showToast(err instanceof Error ? err.message : "搜索销售单失败", "error");
      } finally {
        setLoading(false);
      }
    },
    [searchValue],
  );

  const handleCustomerSearch = useCallback(
    async (nextValue = searchValue) => {
      const query = normalizeSearch(nextValue);
      if (!query) return;
      setLoading(true);
      setSearched(true);
      try {
        setCustomers(await searchCustomers(query));
      } catch (err) {
        console.error(err);
        showToast(err instanceof Error ? err.message : "搜索客户失败", "error");
      } finally {
        setLoading(false);
      }
    },
    [searchValue],
  );

  const handleSupplierSearch = useCallback(
    async (nextValue = searchValue) => {
      const query = normalizeSearch(nextValue);
      if (!query) return;
      setLoading(true);
      setSearched(true);
      try {
        setSuppliers(await searchSuppliers(query));
      } catch (err) {
        console.error(err);
        showToast(err instanceof Error ? err.message : "搜索供应商失败", "error");
      } finally {
        setLoading(false);
      }
    },
    [searchValue],
  );

  const handleDepotSearch = useCallback(
    async (nextValue = searchValue) => {
      const query = normalizeSearch(nextValue);
      if (!query) return;
      setLoading(true);
      setSearched(true);
      try {
        setDepots(await searchDepots(query));
      } catch (err) {
        console.error(err);
        showToast(err instanceof Error ? err.message : "搜索储存点失败", "error");
      } finally {
        setLoading(false);
      }
    },
    [searchValue],
  );

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      setSearchValue(barcode);
      if (mode === "menu" || mode === "inventory") {
        setMode("inventory");
        setLoading(true);
        setSearched(true);
        try {
          setInventories(await findInventoriesByBarcode(barcode));
        } catch (err) {
          console.error(err);
          showToast(err instanceof Error ? err.message : "扫码查询失败", "error");
        } finally {
          setLoading(false);
        }
      } else {
        setMode("product");
        await handleProductSearch(barcode);
      }
    },
    [mode, handleProductSearch],
  );

  const handleCurrentSearch = useCallback(() => {
    switch (mode) {
      case "product":
        void handleProductSearch();
        break;
      case "inventory":
        void handleInventorySearch();
        break;
      case "purchase-order":
        void handlePurchaseOrderSearch();
        break;
      case "sale-order":
        void handleSaleOrderSearch();
        break;
      case "customer":
        void handleCustomerSearch();
        break;
      case "supplier":
        void handleSupplierSearch();
        break;
      case "depot":
        void handleDepotSearch();
        break;
    }
  }, [mode, handleProductSearch, handleInventorySearch, handlePurchaseOrderSearch, handleSaleOrderSearch, handleCustomerSearch, handleSupplierSearch, handleDepotSearch]);

  const goBack = useCallback(() => {
    setMode("menu");
    setSearchValue("");
    setProducts([]);
    setInventories([]);
    setPurchaseOrders([]);
    setSaleOrders([]);
    setCustomers([]);
    setSuppliers([]);
    setDepots([]);
    setSearched(false);
  }, []);

  return {
    mode,
    setMode,
    searchValue,
    setSearchValue,
    products,
    inventories,
    purchaseOrders,
    saleOrders,
    customers,
    suppliers,
    depots,
    loading,
    searched,
    handleProductSearch,
    handleInventorySearch,
    handlePurchaseOrderSearch,
    handleSaleOrderSearch,
    handleCustomerSearch,
    handleSupplierSearch,
    handleDepotSearch,
    handleBarcodeScan,
    handleCurrentSearch,
    goBack,
  };
}
