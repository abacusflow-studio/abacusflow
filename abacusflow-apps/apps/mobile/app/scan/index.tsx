import { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { productApi, type SelectableProduct } from "@abacusflow/core";
import { COLORS } from "@abacusflow/ui-tokens";
import { BarcodeScanner } from "@/components/barcode-scanner";

type ScanMode = "purchase" | "sale" | "lookup";

export default function ScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = (params.mode as ScanMode) || "purchase";

  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    barcode: string;
    product: SelectableProduct | null;
  } | null>(null);

  const handleScan = useCallback(async (barcode: string) => {
    setLoading(true);
    try {
      const products = await productApi.listSelectableProducts();
      const found = products.find((p) => p.barcode === barcode) || null;
      setResult({ barcode, product: found });
    } catch (err) {
      Alert.alert("错误", "查询产品失败");
      setResult({ barcode, product: null });
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }, []);

  const handleCreateProduct = () => {
    router.replace({
      pathname: "/entry/product",
      params: { barcode: result?.barcode, returnTo: mode },
    } as any);
  };

  const handlePurchase = () => {
    if (result?.product) {
      router.replace({
        pathname: "/entry/purchase",
        params: {
          scanProductId: String(result.product.id),
          scanBarcode: result.barcode,
        },
      } as any);
    }
  };

  const handleSale = () => {
    if (result?.product) {
      router.replace({
        pathname: "/entry/sale",
        params: {
          scanProductId: String(result.product.id),
          scanBarcode: result.barcode,
        },
      } as any);
    }
  };

  const handleRescan = () => {
    setResult(null);
    setScanning(true);
  };

  if (scanning) {
    return (
      <BarcodeScanner
        onScan={handleScan}
        onClose={() => router.back()}
        title={mode === "lookup" ? "扫码查库存" : "扫描产品条码"}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>正在查询...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>扫描结果</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        {/* Barcode */}
        <View style={styles.barcodeCard}>
          <Ionicons name="barcode-outline" size={22} color={COLORS.primary} />
          <Text style={styles.barcodeText}>{result?.barcode}</Text>
        </View>

        {result?.product ? (
          <View style={styles.resultCard}>
            <View style={styles.productRow}>
              <Ionicons name="cube" size={28} color={COLORS.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{result.product.name}</Text>
                <Text style={styles.productMeta}>
                  {result.product.type === "asset" ? "资产" : "物料"} ·{" "}
                  {result.product.barcode}
                </Text>
              </View>
              <View style={styles.foundBadge}>
                <Text style={styles.foundBadgeText}>已存在</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handlePurchase}>
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: COLORS.primaryLight },
                ]}
              >
                <Ionicons
                  name="download-outline"
                  size={22}
                  color={COLORS.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>入库</Text>
                <Text style={styles.actionDesc}>创建采购入库单</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textDisabled}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleSale}>
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: COLORS.successLight },
                ]}
              >
                <Ionicons
                  name="arrow-up-outline"
                  size={22}
                  color={COLORS.success}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>出库</Text>
                <Text style={styles.actionDesc}>
                  创建销售出库单
                  {result.product.type === "asset" ? "，需确认SN" : ""}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textDisabled}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultCard}>
            <View style={styles.notFoundWrap}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={COLORS.warning}
              />
              <Text style={styles.notFoundTitle}>产品未录入</Text>
              <Text style={styles.notFoundDesc}>该条码尚未注册</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCreateProduct}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>建档并入库</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan}>
          <Ionicons name="scan" size={18} color={COLORS.primary} />
          <Text style={styles.rescanText}>重新扫描</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: COLORS.text },
  content: { flex: 1, padding: 16, gap: 16 },
  barcodeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
  },
  barcodeText: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.primary,
    flex: 1,
  },
  resultCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  productName: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  productMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  foundBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  foundBadgeText: { fontSize: 12, color: COLORS.success, fontWeight: "600" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  actionDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  notFoundWrap: { alignItems: "center", paddingVertical: 12, gap: 6 },
  notFoundTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  notFoundDesc: { fontSize: 14, color: COLORS.textSecondary },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  rescanText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },
});
