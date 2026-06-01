import { useState, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@abacusflow/utils";
import { BarcodeScanner } from "@components/ui/barcode-scanner";

import { useLookupSearch } from "../hooks/use-lookup-search";
import { LookupMenu } from "../components/lookup-menu";
import { LookupSearchBar } from "../components/lookup-search-bar";
import { ProductResults } from "../components/product-results";
import { InventoryResults } from "../components/inventory-results";
import { OrderResults } from "../components/order-results";

export default function LookupScreen() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const {
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
  } = useLookupSearch();

  const handleScanPress = useCallback(() => {
    setScanning(true);
  }, []);

  const handleScanResult = useCallback(
    async (barcode: string) => {
      setScanning(false);
      await handleBarcodeScan(barcode);
    },
    [handleBarcodeScan],
  );

  if (scanning) {
    return (
      <BarcodeScanner
        onScan={handleScanResult}
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
        <LookupMenu
          onScanPress={handleScanPress}
          onProductPress={() => {
            setMode("product");
            setSearchValue("");
          }}
          onInventoryPress={() => {
            setMode("inventory");
            setSearchValue("");
          }}
          onOrderPress={() => {
            setMode("order");
            setSearchValue("");
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LookupSearchBar
        mode={mode}
        value={searchValue}
        onChange={setSearchValue}
        onSubmit={handleCurrentSearch}
        onScan={handleScanPress}
        onBack={goBack}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : mode === "product" ? (
        <ProductResults
          data={products}
          loading={loading}
          searched={searched}
          onRefresh={() => handleProductSearch()}
          onPress={(item) => router.push(`/product/${item.id}` as any)}
        />
      ) : mode === "inventory" ? (
        <InventoryResults
          data={inventories}
          loading={loading}
          searched={searched}
          onRefresh={() => handleInventorySearch()}
          onPress={(item) => router.push(`/inventory/${item.id}` as any)}
        />
      ) : (
        <OrderResults
          purchaseOrders={purchaseOrders}
          saleOrders={saleOrders}
          loading={loading}
          searched={searched}
          onRefresh={() => handleOrderSearch()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
