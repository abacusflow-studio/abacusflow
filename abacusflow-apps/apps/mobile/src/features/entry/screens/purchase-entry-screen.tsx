import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { COLORS } from "@abacusflow/utils";
import { BarcodeScanner } from "@components/ui/barcode-scanner";

import type { PurchaseOrderItem, PartnerOption } from "../types";
import { createPurchaseOrder } from "../services/order-service";
import { loadPurchaseSelectionData } from "../services/selection-service";
import { useDraftPersistence } from "../hooks/use-draft-persistence";
import { useBarcodeScanning } from "../hooks/use-barcode-scanning";
import { useOrderForm } from "../hooks/use-order-form";
import { PartnerChipSelector } from "../components/partner-chip-selector";
import { OrderItemCard } from "../components/order-item-card";
import { OrderBottomBar } from "../components/order-bottom-bar";
import { MoreOptionsSection } from "../components/more-options-section";
import { ScanButton } from "../components/scan-button";

export default function PurchaseEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    scanProductId?: string;
    scanBarcode?: string;
    draftId?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [products, setProducts] = useState<
    Awaited<ReturnType<typeof loadPurchaseSelectionData>>["products"]
  >([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<
    number | undefined
  >();

  const form = useOrderForm<PurchaseOrderItem>();
  const draft = useDraftPersistence("purchase", params.draftId);
  const { scanning, setScanning, handleScan } = useBarcodeScanning(products);

  // 加载数据
  useEffect(() => {
    (async () => {
      try {
        const data = await loadPurchaseSelectionData();
        setPartners(data.partners);
        setProducts(data.products);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 恢复草稿
  useEffect(() => {
    if (params.draftId && partners.length > 0 && products.length > 0) {
      draft.restoreDraft(params.draftId).then((payload) => {
        if (!payload) return;
        setSelectedPartnerId(payload.supplierId as number | undefined);
        form.setOrderDate((payload.orderDate as string) || form.orderDate);
        form.setItems((payload.items as PurchaseOrderItem[]) || []);
        form.setNote((payload.note as string) || "");
      });
    }
  }, [params.draftId, partners, products]);

  // 自动添加扫码产品
  useEffect(() => {
    if (params.scanProductId && products.length > 0) {
      const pid = Number(params.scanProductId);
      const product = products.find((p) => p.id === pid);
      if (product && !form.items.some((i) => i.productId === pid)) {
        addItem(product);
      }
    }
  }, [params.scanProductId, products]);

  // 自动保存草稿
  useEffect(() => {
    if (form.items.length > 0) {
      draft.autoSave(
        {
          supplierId: selectedPartnerId,
          orderDate: form.orderDate,
          items: form.items,
          note: form.note,
        },
        `${form.items.length} 个产品`,
      );
    }
  }, [form.items, selectedPartnerId, form.note]);

  const addItem = useCallback(
    (product: (typeof products)[number]) => {
      form.setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          quantity: "1",
          unitPrice: "",
        },
      ]);
    },
    [form],
  );

  const onScan = useCallback(
    (barcode: string) => {
      handleScan(barcode, addItem, "purchase");
    },
    [handleScan, addItem],
  );

  const handleSubmit = async () => {
    if (!selectedPartnerId) {
      Alert.alert("提示", "请选择供应商");
      return;
    }
    if (form.items.length === 0) {
      Alert.alert("提示", "请扫描或添加产品");
      return;
    }
    if (!form.validateItems("productName")) return;

    setSubmitting(true);
    try {
      await createPurchaseOrder({
        supplierId: selectedPartnerId,
        orderDate: form.orderDate,
        items: form.items,
        note: form.note,
      });
      await draft.clearOnSuccess();
      Alert.alert("入库成功", "采购单已提交", [
        { text: "继续入库", onPress: () => { form.resetForm(); draft.resetDraftId(); } },
        { text: "回到录入", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "提交失败";
      await draft.markFailed(msg);
      Alert.alert("提交失败", msg + "\n\n已保存草稿，可稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (scanning) {
    return (
      <BarcodeScanner
        onScan={onScan}
        onClose={() => setScanning(false)}
        title="入库扫码"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <PartnerChipSelector
            partners={partners}
            selectedId={selectedPartnerId}
            onSelect={(id) => setSelectedPartnerId(id)}
            label="1. 选择供应商"
          />

          <Text style={styles.stepLabel}>2. 扫描产品</Text>
          <ScanButton label="扫码添加产品" onPress={() => setScanning(true)} />

          {form.items.length > 0 && (
            <View style={styles.itemsSection}>
              {form.items.map((item, idx) => (
                <OrderItemCard
                  key={item.productId}
                  title={item.productName}
                  subtitle={item.barcode}
                  quantity={item.quantity}
                  unitPrice={item.unitPrice}
                  onQuantityChange={(v) => form.updateItem(idx, "quantity", v)}
                  onUnitPriceChange={(v) => form.updateItem(idx, "unitPrice", v)}
                  onDelete={() => form.removeItem(idx)}
                />
              ))}
            </View>
          )}

          <MoreOptionsSection
            showMore={form.showMore}
            onToggle={() => form.setShowMore(!form.showMore)}
            orderDate={form.orderDate}
            onOrderDateChange={form.setOrderDate}
            note={form.note}
            onNoteChange={form.setNote}
          />
        </ScrollView>

        <OrderBottomBar
          itemCount={form.items.length}
          totalAmount={form.totalAmount}
          submitting={submitting}
          submitLabel="提交入库"
          onSubmit={handleSubmit}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 16 },
  stepLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 8,
  },
  itemsSection: { gap: 12, marginBottom: 12 },
});
