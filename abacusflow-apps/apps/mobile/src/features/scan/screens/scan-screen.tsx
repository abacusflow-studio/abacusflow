import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";
import { BarcodeScanner } from "@components/ui/barcode-scanner";

import type { ScanMode, ScanResult } from "../types";
import { findProductByBarcode } from "../services/scan-service";
import { ScanResultCard } from "../components/scan-result-card";

export default function ScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = (params.mode as ScanMode) || "purchase";

  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = useCallback(async (barcode: string) => {
    setLoading(true);
    try {
      const product = await findProductByBarcode(barcode);
      setResult({ barcode, product });
    } catch {
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

      {result && (
        <ScanResultCard
          barcode={result.barcode}
          product={result.product}
          onPurchase={handlePurchase}
          onSale={handleSale}
          onCreateProduct={handleCreateProduct}
        />
      )}

      <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan}>
        <Ionicons name="scan" size={18} color={COLORS.primary} />
        <Text style={styles.rescanText}>重新扫描</Text>
      </TouchableOpacity>
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
    margin: 16,
  },
  rescanText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },
});
