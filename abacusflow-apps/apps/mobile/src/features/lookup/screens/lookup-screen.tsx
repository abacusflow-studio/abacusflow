import { useState, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { THEME } from "@lib/theme";
import { BarcodeScanner } from "@components/ui/barcode-scanner";

import { useLookupSearch } from "../hooks/use-lookup-search";
import { LookupMenu } from "../components/lookup-menu";
import { LookupSearchBar } from "../components/lookup-search-bar";
import { ProductResults } from "../components/product-results";
import { InventoryResults } from "../components/inventory-results";
import { PurchaseOrderResults } from "../components/purchase-order-results";
import { SaleOrderResults } from "../components/sale-order-results";
import { CustomerResults } from "../components/customer-results";
import { SupplierResults } from "../components/supplier-results";
import { DepotResults } from "../components/depot-results";

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
        title={mode === "inventory" || mode === "menu" ? "扫码查库存" : "扫码查产品"}
      />
    );
  }

  if (mode === "menu") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <LookupMenu
          onScanPress={handleScanPress}
          onProductPress={() => { setMode("product"); setSearchValue(""); }}
          onInventoryPress={() => { setMode("inventory"); setSearchValue(""); }}
          onPurchaseOrderPress={() => { setMode("purchase-order"); setSearchValue(""); }}
          onSaleOrderPress={() => { setMode("sale-order"); setSearchValue(""); }}
          onCustomerPress={() => { setMode("customer"); setSearchValue(""); }}
          onSupplierPress={() => { setMode("supplier"); setSearchValue(""); }}
          onDepotPress={() => { setMode("depot"); setSearchValue(""); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <LookupSearchBar
        mode={mode}
        value={searchValue}
        onChange={setSearchValue}
        onSubmit={handleCurrentSearch}
        onScan={handleScanPress}
        onBack={goBack}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={THEME.light.primary} />
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
      ) : mode === "purchase-order" ? (
        <PurchaseOrderResults
          data={purchaseOrders}
          loading={loading}
          searched={searched}
          onRefresh={() => handlePurchaseOrderSearch()}
        />
      ) : mode === "sale-order" ? (
        <SaleOrderResults
          data={saleOrders}
          loading={loading}
          searched={searched}
          onRefresh={() => handleSaleOrderSearch()}
        />
      ) : mode === "customer" ? (
        <CustomerResults
          data={customers}
          loading={loading}
          searched={searched}
          onRefresh={() => handleCustomerSearch()}
          onPress={(item) => router.push(`/partner/customer/${item.id}` as any)}
        />
      ) : mode === "supplier" ? (
        <SupplierResults
          data={suppliers}
          loading={loading}
          searched={searched}
          onRefresh={() => handleSupplierSearch()}
          onPress={(item) => router.push(`/partner/supplier/${item.id}` as any)}
        />
      ) : (
        <DepotResults
          data={depots}
          loading={loading}
          searched={searched}
          onRefresh={() => handleDepotSearch()}
          onPress={(item) => router.push(`/depot/${item.id}` as any)}
        />
      )}
    </SafeAreaView>
  );
}
