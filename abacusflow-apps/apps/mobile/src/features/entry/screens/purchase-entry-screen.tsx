import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedCard } from "@components/ui/animated-card";
import { BarcodeScanner } from "@components/ui/barcode-scanner";
import { CardContent } from "@components/ui/card";
import { LoadingState } from "@components/ui/loading-state";
import { Text } from "@components/ui/text";
import { triggerHaptic } from "@lib/haptics";
import { THEME } from "@lib/theme";
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
import { ProductSelector } from "../components/product-selector";

export default function PurchaseEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    scanProductId?: string;
    scanBarcode?: string;
    draftId?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
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

  useEffect(() => {
    if (params.scanProductId && products.length > 0) {
      const pid = Number(params.scanProductId);
      const product = products.find((p) => p.id === pid);
      if (product && !form.items.some((i) => i.productId === pid)) {
        addItem(product);
      }
    }
  }, [params.scanProductId, products]);

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
      void triggerHaptic("selection");
      form.setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productType: product.type,
          barcode: product.barcode,
          quantity: "1",
          unitPrice: "",
          serialNumber: undefined,
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
      void triggerHaptic("error");
      Alert.alert("提示", "请选择供应商");
      return;
    }
    if (form.items.length === 0) {
      void triggerHaptic("error");
      Alert.alert("提示", "请扫描或添加产品");
      return;
    }
    if (!form.validateItems("productName")) return;

    for (const item of form.items) {
      if (item.productType === "asset" && !item.serialNumber?.trim()) {
        void triggerHaptic("error");
        Alert.alert("提示", `「${item.productName}」是资产产品，必须填写序列号`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await createPurchaseOrder({
        supplierId: selectedPartnerId,
        orderDate: form.orderDate,
        items: form.items,
        note: form.note,
      });
      await draft.clearOnSuccess();
      void triggerHaptic("success");
      Alert.alert("入库成功", "采购单已创建并完成入库", [
        {
          text: "继续入库",
          onPress: () => {
            form.resetForm();
            draft.resetDraftId();
          },
        },
        { text: "回到录入", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "提交失败";
      await draft.markFailed(msg);
      void triggerHaptic("error");
      Alert.alert("提交失败", msg + "\n\n已保存草稿，可稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="正在准备入库资料..." />;
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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-5 p-4 pb-5"
          keyboardShouldPersistTaps="handled"
        >
          <EntryHeader />

          <AnimatedCard index={0}>
            <CardContent className="gap-4 px-4 py-4">
              <StepTitle step="01" title="供应商" desc="确认本次入库来源" />
              <PartnerChipSelector
                partners={partners}
                selectedId={selectedPartnerId}
                onSelect={(id) => setSelectedPartnerId(id)}
                label="选择供应商"
              />
            </CardContent>
          </AnimatedCard>

          <AnimatedCard index={1}>
            <CardContent className="gap-4 px-4 py-4">
              <StepTitle
                step="02"
                title="添加产品"
                desc="扫码优先，找不到时可手动选择"
              />
              <ScanButton
                label="扫码添加产品"
                onPress={() => setScanning(true)}
                onManualSelect={() => setShowProductSelector(true)}
              />
            </CardContent>
          </AnimatedCard>

          {form.items.length > 0 ? (
            <View className="gap-3">
              <StepTitle
                step="03"
                title="入库明细"
                desc="补充数量、单价和资产序列号"
              />
              {form.items.map((item, idx) => (
                <OrderItemCard
                  key={item.productId}
                  title={item.productName}
                  subtitle={item.barcode}
                  quantity={item.quantity}
                  unitPrice={item.unitPrice}
                  isAsset={item.productType === "asset"}
                  serialNumber={item.serialNumber}
                  onQuantityChange={(v) => form.updateItem(idx, "quantity", v)}
                  onUnitPriceChange={(v) => form.updateItem(idx, "unitPrice", v)}
                  onSerialNumberChange={
                    item.productType === "asset"
                      ? (v) => form.updateItem(idx, "serialNumber", v)
                      : undefined
                  }
                  onDelete={() => form.removeItem(idx)}
                />
              ))}
            </View>
          ) : (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-5 py-8">
              <Ionicons
                name="scan-outline"
                size={32}
                color={THEME.light.mutedForeground}
              />
              <Text className="text-sm font-semibold">还没有入库产品</Text>
              <Text className="text-center text-xs text-muted-foreground">
                扫描产品条码后，明细会自动出现在这里
              </Text>
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

      <ProductSelector
        visible={showProductSelector}
        products={products}
        selectedIds={form.items.map((i) => i.productId)}
        onSelect={(product) => addItem(product)}
        onClose={() => setShowProductSelector(false)}
      />
    </SafeAreaView>
  );
}

function EntryHeader() {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons
            name="download-outline"
            size={18}
            color={THEME.light.primary}
          />
        </View>
        <View>
          <Text className="text-base font-bold">采购入库</Text>
          <Text className="text-xs text-muted-foreground">先选供应商，再扫码</Text>
        </View>
      </View>
    </View>
  );
}

function StepTitle({
  step,
  title,
  desc,
}: {
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="rounded-lg bg-primary/10 px-2 py-1">
        <Text className="text-xs font-bold text-primary">{step}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold">{title}</Text>
        <Text className="mt-1 text-xs text-muted-foreground">{desc}</Text>
      </View>
    </View>
  );
}
