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
import { productApi, inventoryApi, type BasicProduct, type BasicInventory } from "@abacusflow/core";
import { COLORS } from "@abacusflow/ui-tokens";
import { translateProductType, translateProductUnit } from "@abacusflow/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";

type LookupMode = "menu" | "product" | "inventory";

export default function LookupScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<LookupMode>("menu");
  const [scanning, setScanning] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [products, setProducts] = useState<BasicProduct[]>([]);
  const [inventories, setInventories] = useState<BasicInventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleProductSearch = useCallback(async () => {
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

  const handleBarcodeScan = (barcode: string) => {
    setScanning(false);
    setSearchValue(barcode);
    setMode("product");
    setTimeout(() => handleProductSearch(), 100);
  };

  if (scanning) {
    return (
      <BarcodeScanner
        onScan={handleBarcodeScan}
        onClose={() => setScanning(false)}
        title="扫码查库存"
      />
    );
  }

  if (mode === "menu") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>查询</Text>
          <Text style={styles.menuHint}>查找产品、库存信息，辅助录入</Text>

          <TouchableOpacity
            style={styles.scanLookupBtn}
            onPress={() => setScanning(true)}
          >
            <Ionicons name="scan" size={28} color="#fff" />
            <View style={styles.scanLookupText}>
              <Text style={styles.scanLookupTitle}>扫码查库存</Text>
              <Text style={styles.scanLookupDesc}>扫描条码查看产品和库存</Text>
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
              <Ionicons name="file-tray-outline" size={28} color={COLORS.success} />
              <Text style={styles.menuCardTitle}>查库存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TouchableOpacity onPress={() => setMode("menu")} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder={mode === "product" ? "搜索产品名称" : "搜索产品名称查库存"}
          onSubmitEditing={mode === "product" ? handleProductSearch : handleInventorySearch}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity
          onPress={mode === "product" ? handleProductSearch : handleInventorySearch}
          style={styles.searchBtn}
        >
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
                {translateProductType(item.type)} · {translateProductUnit(item.unit)}
                {item.categoryName ? ` · ${item.categoryName}` : ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : (
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
                {item.depotNames?.length ? ` · ${item.depotNames.join(", ")}` : ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  menuContent: { flex: 1, padding: 16 },
  menuTitle: { fontSize: 22, fontWeight: "700", color: COLORS.text, marginTop: 8 },
  menuHint: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: 24 },
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
  scanLookupDesc: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  menuGrid: { flexDirection: "row", gap: 12 },
  menuCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuCardTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
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
});
