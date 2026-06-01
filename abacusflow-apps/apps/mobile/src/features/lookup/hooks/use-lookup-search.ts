import { useState, useCallback } from "react";
import type {
  BasicProduct,
  BasicInventory,
  BasicPurchaseOrder,
  BasicSaleOrder,
} from "@abacusflow/core";
import type { LookupMode } from "../types";
import {
  searchProducts,
  searchInventories,
  searchOrders,
  findInventoriesByBarcode,
} from "../services/lookup-service";

/**
 * 查询搜索 hook
 * 封装按模式切换的搜索逻辑
 */
export function useLookupSearch() {
  const [mode, setMode] = useState<LookupMode>("menu");
  const [searchValue, setSearchValue] = useState("");
  const [products, setProducts] = useState<BasicProduct[]>([]);
  const [inventories, setInventories] = useState<BasicInventory[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<BasicPurchaseOrder[]>(
    [],
  );
  const [saleOrders, setSaleOrders] = useState<BasicSaleOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const normalizeSearch = (value: string) => value.trim();

  /** 搜索产品 */
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
      } finally {
        setLoading(false);
      }
    },
    [searchValue],
  );

  /** 搜索库存 */
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
      } finally {
        setLoading(false);
      }
    },
    [searchValue],
  );

  /** 搜索订单 */
  const handleOrderSearch = useCallback(
    async (nextValue = searchValue) => {
      const query = normalizeSearch(nextValue);
      if (!query) return;
      setLoading(true);
      setSearched(true);
      try {
        const result = await searchOrders(query);
        setPurchaseOrders(result.purchaseOrders);
        setSaleOrders(result.saleOrders);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [searchValue],
  );

  /** 条码扫描处理 */
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

  /** 执行当前模式的搜索 */
  const handleCurrentSearch = useCallback(() => {
    if (mode === "product") {
      void handleProductSearch();
    } else if (mode === "inventory") {
      void handleInventorySearch();
    } else {
      void handleOrderSearch();
    }
  }, [mode, handleProductSearch, handleInventorySearch, handleOrderSearch]);

  /** 返回菜单 */
  const goBack = useCallback(() => {
    setMode("menu");
    setSearchValue("");
    setProducts([]);
    setInventories([]);
    setPurchaseOrders([]);
    setSaleOrders([]);
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
    loading,
    searched,
    handleProductSearch,
    handleInventorySearch,
    handleOrderSearch,
    handleBarcodeScan,
    handleCurrentSearch,
    goBack,
  };
}
