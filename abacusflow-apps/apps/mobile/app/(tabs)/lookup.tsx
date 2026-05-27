import { useState, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  productApi,
  inventoryApi,
  transactionApi,
  type BasicProduct,
  type BasicInventory,
  type BasicPurchaseOrder,
  type BasicSaleOrder,
} from "@abacusflow/core";
import { COLORS } from "@abacusflow/ui-tokens";
import {
  translateProductType,
  translateProductUnit,
  formatCurrency,
} from "@abacusflow/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";

type LookupMode = "menu" | "product" | "inventory" | "order";

const ORDER_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  completed: {
    label: "已完成",
    bg: COLORS.successLight,
    color: COLORS.success,
  },
  pending: { label: "待处理", bg: COLORS.warningLight, color: COLORS.warning },
  canceled: { label: "已取消", bg: COLORS.bg, color: COLORS.textTertiary },
  reversed: { label: "已冲销", bg: COLORS.dangerLight, color: COLORS.danger },
};

export default function LookupScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<LookupMode>("menu");
  const [scanning, setScanning] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [products, setProducts] = useState<BasicProduct[]>([]);
  const [inventories, setInventories] = useState<BasicInventory[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<BasicPurchaseOrder[]>(
    [],
  );
  const [saleOrders, setSaleOrders] = useState<BasicSaleOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleProductSearch = useCallback(async () => {
    if (!searchValue.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await productApi.listBasicProductsPage({
        pageIndex: 1,
        pageSize: 50,
        name: searchValue || undefined,
      });
      setProducts(res.content);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchValue]);

  const handleInventorySearch = useCallback(async () => {
    if (!searchValue.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await inventoryApi.listBasicInventoriesPage({
        pageIndex: 1,
        pageSize: 50,
        productName: searchValue || undefined,
      });
      setInventories(res.content);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchValue]);

  const handleOrderSearch = useCallback(async () => {
    if (!searchValue.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const [purchaseRes, saleRes] = await Promise.all([
        transactionApi.listBasicPurchaseOrdersPage({
          pageIndex: 1,
          pageSize: 50,
          supplierName: searchValue || undefined,
        }),
        transactionApi.listBasicSaleOrdersPage({
          pageIndex: 1,
          pageSize: 50,
          customerName: searchValue || undefined,
        }),
      ]);
      setPurchaseOrders(purchaseRes.content ?? []);
      setSaleOrders(saleRes.content ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchValue]);

  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      setScanning(false);
      setSearchValue(barcode);
      // 扫码查库存：用条码查产品，再查该产品的库存
      if (mode === "menu" || mode === "inventory") {
        setMode("inventory");
        setTimeout(async () => {
          setLoading(true);
          setSearched(true);
          try {
            const prodRes = await productApi.listBasicProductsPage({
              pageIndex: 1,
              pageSize: 1,
              barcode,
            });
            if (prodRes.content.length > 0) {
              const product = prodRes.content[0];
              const invRes = await inventoryApi.listBasicInventoriesPage({
                pageIndex: 1,
                pageSize: 50,
                productName: product.name,
              });
              setInventories(invRes.content);
            } else {
              setInventories([]);
            }
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        }, 100);
      } else {
        // 产品查询模式：直接搜产品
        setMode("product");
        setTimeout(() => handleProductSearch(), 100);
      }
    },
    [mode, handleProductSearch],
  );

  const goBack = () => {
    setMode("menu");
    setSearchValue("");
    setProducts([]);
    setInventories([]);
    setPurchaseOrders([]);
    setSaleOrders([]);
    setSearched(false);
  };

  const currentSearch = () => {
    if (mode === "product") return handleProductSearch;
    if (mode === "inventory") return handleInventorySearch;
    return handleOrderSearch;
  };

  if (scanning) {
    return (
      <BarcodeScanner
        onScan={handleBarcodeScan}
        onClose={() => setScanning(false)}
        title={
          mode === "inventory" || mode === "menu" ? "扫码查库存" : "扫码查产品"
        }
      />
    );
  }

  if (mode === "menu") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>查询</Text>
          <Text style={styles.menuHint}>查找产品、库存、订单信息</Text>

          <TouchableOpacity
            style={styles.scanLookupBtn}
            onPress={() => setScanning(true)}
          >
            <Ionicons name="scan" size={28} color="#fff" />
            <View style={styles.scanLookupText}>
              <Text style={styles.scanLookupTitle}>扫码查库存</Text>
              <Text style={styles.scanLookupDesc}>扫描条码查看产品库存</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => {
                setMode("product");
                setSearchValue("");
                setProducts([]);
                setSearched(false);
              }}
            >
              <Ionicons name="cube-outline" size={28} color={COLORS.primary} />
              <Text style={styles.menuCardTitle}>查产品</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => {
                setMode("inventory");
                setSearchValue("");
                setInventories([]);
                setSearched(false);
              }}
            >
              <Ionicons
                name="file-tray-outline"
                size={28}
                color={COLORS.success}
              />
              <Text style={styles.menuCardTitle}>查库存</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => {
                setMode("order");
                setSearchValue("");
                setPurchaseOrders([]);
                setSaleOrders([]);
                setSearched(false);
              }}
            >
              <Ionicons
                name="receipt-outline"
                size={28}
                color={COLORS.warning}
              />
              <Text style={styles.menuCardTitle}>查单据</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder={
            mode === "product"
              ? "搜索产品名称"
              : mode === "inventory"
                ? "搜索产品名称查库存"
                : "搜索供应商 / 客户 / 单号"
          }
          onSubmitEditing={currentSearch()}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity
          onPress={() => setScanning(true)}
          style={styles.scanBtn}
        >
          <Ionicons name="scan" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={currentSearch()} style={styles.searchBtn}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : mode === "product" ? (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          onRefresh={handleProductSearch}
          refreshing={loading}
          ListEmptyComponent={
            searched ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>未找到产品</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/product/${item.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardBarcode}>{item.barcode}</Text>
              </View>
              <Text style={styles.cardDetail}>
                {translateProductType(item.type)} ·{" "}
                {translateProductUnit(item.unit)}
                {item.categoryName ? ` · ${item.categoryName}` : ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : mode === "inventory" ? (
        <FlatList
          data={inventories}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          onRefresh={handleInventorySearch}
          refreshing={loading}
          ListEmptyComponent={
            searched ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>未找到库存</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/inventory/${item.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.productName}</Text>
                <Text style={styles.cardBarcode}>
                  {item.productType === "asset" ? "资产" : "物料"}
                </Text>
              </View>
              <Text style={styles.cardDetail}>
                库存: {item.quantity}
                {item.depotNames?.length
                  ? ` · ${item.depotNames.join(", ")}`
                  : ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        /* 订单查询 */
        <FlatList
          data={[
            ...purchaseOrders.map((o) => ({
              ...o,
              _type: "purchase" as const,
            })),
            ...saleOrders.map((o) => ({ ...o, _type: "sale" as const })),
          ].sort((a, b) => {
            const ta =
              typeof a.createdAt === "number"
                ? a.createdAt
                : new Date(a.createdAt).getTime();
            const tb =
              typeof b.createdAt === "number"
                ? b.createdAt
                : new Date(b.createdAt).getTime();
            return tb - ta;
          })}
          keyExtractor={(item) => `${item._type}-${item.id}`}
          contentContainerStyle={styles.list}
          onRefresh={handleOrderSearch}
          refreshing={loading}
          ListEmptyComponent={
            searched ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>未找到单据</Text>
                <Text style={styles.emptyHint}>
                  输入供应商名、客户名或单号搜索
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const statusCfg =
              ORDER_STATUS_CONFIG[item.status] ?? ORDER_STATUS_CONFIG.pending;
            const isPurchase = item._type === "purchase";
            const partyName = isPurchase
              ? (item as BasicPurchaseOrder).supplierName
              : (item as BasicSaleOrder).customerName;
            return (
              <TouchableOpacity style={styles.card}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.orderTypeTag,
                      {
                        backgroundColor: isPurchase
                          ? COLORS.primaryLight
                          : COLORS.successLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderTypeTagText,
                        {
                          color: isPurchase ? COLORS.primary : COLORS.success,
                        },
                      ]}
                    >
                      {isPurchase ? "入库" : "出库"}
                    </Text>
                  </View>
                  <Text style={styles.orderNo}>{item.orderNo}</Text>
                  <View
                    style={[
                      styles.statusTag,
                      { backgroundColor: statusCfg.bg },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusCfg.color }]}
                    >
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.orderBody}>
                  <Text style={styles.orderParty}>
                    {isPurchase ? "供应商" : "客户"}: {partyName || "-"}
                  </Text>
                  <View style={styles.orderMetrics}>
                    <Text style={styles.orderMetric}>
                      {item.itemCount} 种 · {item.totalQuantity} 件
                    </Text>
                    <Text style={styles.orderAmount}>
                      {formatCurrency(item.totalAmount)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  menuContent: { flex: 1, padding: 16 },
  menuTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
  },
  menuHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 24,
  },
  scanLookupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  scanLookupText: { flex: 1 },
  scanLookupTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  scanLookupDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  menuGrid: { flexDirection: "row", gap: 12 },
  menuCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuCardTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  searchBar: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { justifyContent: "center", paddingHorizontal: 4 },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  scanBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  cardBarcode: { fontSize: 12, color: COLORS.textTertiary },
  cardDetail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: COLORS.textTertiary },
  emptyHint: { fontSize: 12, color: COLORS.textDisabled, marginTop: 4 },
  // Order-specific styles
  orderTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderTypeTagText: { fontSize: 12, fontWeight: "600" },
  orderNo: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginLeft: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { fontSize: 12, fontWeight: "500" },
  orderBody: { marginTop: 6 },
  orderParty: { fontSize: 13, color: COLORS.textSecondary },
  orderMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  orderMetric: { fontSize: 13, color: COLORS.textSecondary },
  orderAmount: { fontSize: 15, fontWeight: "700", color: COLORS.text },
});
