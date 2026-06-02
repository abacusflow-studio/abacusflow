import { useState, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { THEME } from "@lib/theme";
import { BarcodeScanner } from "@components/ui/barcode-scanner";
import { showToast } from "@hooks/use-toast";

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
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "查询产品失败", "error");
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
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator size="large" color={THEME.light.primary} />
        <Text variant="muted">正在查询...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={THEME.light.foreground}
          />
        </Button>
        <Text className="text-lg font-semibold">扫描结果</Text>
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

      <View className="p-4">
        <Button variant="outline" onPress={handleRescan}>
          <Ionicons name="scan" size={18} color={THEME.light.primary} />
          <Text
            className="text-base font-semibold"
            style={{ color: THEME.light.primary }}
          >
            重新扫描
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
