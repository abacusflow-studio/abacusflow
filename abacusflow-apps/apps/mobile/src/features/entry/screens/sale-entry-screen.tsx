import { useState, useEffect, useCallback, useRef } from "react";
import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { translateInventoryUnitType } from "@abacusflow/utils";
import type { SelectableProduct, BasicInventoryUnit } from "@abacusflow/core";

import { AnimatedCard } from "@components/ui/animated-card";
import { BarcodeScanner } from "@components/ui/barcode-scanner";
import { CardContent } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { LoadingState } from "@components/ui/loading-state";
import { Text } from "@components/ui/text";
import { triggerHaptic } from "@lib/haptics";
import { THEME } from "@lib/theme";
import type { SaleOrderItem, PartnerOption } from "../types";
import { createSaleOrder } from "../services/order-service";
import { loadSaleSelectionData } from "../services/selection-service";
import { findSellableUnitsForProduct } from "@features/inventory/services/inventory-service";
import { useDraftPersistence } from "../hooks/use-draft-persistence";
import { useBarcodeScanning } from "../hooks/use-barcode-scanning";
import { useOrderForm } from "../hooks/use-order-form";
import { PartnerChipSelector } from "../components/partner-chip-selector";
import { OrderItemCard } from "../components/order-item-card";
import { OrderBottomBar } from "../components/order-bottom-bar";
import { MoreOptionsSection } from "../components/more-options-section";
import { ScanButton } from "../components/scan-button";
import { InventoryUnitSelector } from "../components/inventory-unit-selector";

const matchesUnitCode = (unit: BasicInventoryUnit, code: string) => {
  const keyword = code.trim();
  if (!keyword) return false;
  return (
    unit.serialNumber === keyword ||
    unit.batchCode === keyword ||
    unit.title.includes(keyword)
  );
};

const formatUnitOption = (unit: BasicInventoryUnit) => {
  const code = unit.serialNumber || unit.batchCode || unit.title;
  const depot = unit.depotName ? ` · ${unit.depotName}` : "";
  return `${code} · 可用 ${unit.remainingQuantity}${depot}`;
};

export default function SaleEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    scanProductId?: string;
    scanBarcode?: string;
    draftId?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scanningSN, setScanningSN] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<
    number | undefined
  >();
  const [discountFactor, setDiscountFactor] = useState("");
  const [snProductContext, setSnProductContext] =
    useState<SelectableProduct | null>(null);
  const handledScanProductIdRef = useRef<string | undefined>(undefined);

  const form = useOrderForm<SaleOrderItem>();
  const draft = useDraftPersistence("sale", params.draftId);
  const { scanning, setScanning } = useBarcodeScanning(products);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadSaleSelectionData();
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
    if (params.draftId && partners.length > 0) {
      draft.restoreDraft(params.draftId).then((payload) => {
        if (!payload) return;
        setSelectedPartnerId(payload.customerId as number | undefined);
        form.setOrderDate((payload.orderDate as string) || form.orderDate);
        form.setItems((payload.items as SaleOrderItem[]) || []);
        setDiscountFactor((payload.discountFactor as string) || "");
        form.setNote((payload.note as string) || "");
      });
    }
  }, [params.draftId, partners]);

  useEffect(() => {
    if (form.items.length > 0) {
      draft.autoSave(
        {
          customerId: selectedPartnerId,
          orderDate: form.orderDate,
          items: form.items,
          discountFactor,
          note: form.note,
        },
        `${form.items.length} 个库存单元`,
      );
    }
  }, [form.items, selectedPartnerId, discountFactor, form.note]);

  const isUnitAlreadySelected = useCallback(
    (unit: BasicInventoryUnit) =>
      form.items.some((item) => item.inventoryUnitId === unit.id),
    [form.items],
  );

  const addUnitToItems = useCallback(
    (unit: BasicInventoryUnit) => {
      if (isUnitAlreadySelected(unit)) {
        void triggerHaptic("error");
        Alert.alert("提示", `「${unit.title}」已在明细中`);
        return;
      }
      void triggerHaptic("selection");
      form.setItems((prev) => [
        ...prev,
        {
          inventoryUnitId: unit.id,
          title: unit.title,
          quantity: "1",
          unitPrice: "",
          remainingQuantity: unit.remainingQuantity,
        },
      ]);
    },
    [isUnitAlreadySelected, form],
  );

  const handleScannedProduct = useCallback(
    async (product: SelectableProduct) => {
      let available: BasicInventoryUnit[];
      try {
        const allUnits = await findSellableUnitsForProduct(product);
        available = allUnits.filter((u) => !isUnitAlreadySelected(u));
      } catch (err) {
        console.error(err);
        void triggerHaptic("error");
        Alert.alert("查询失败", "库存单元查询失败，请稍后重试");
        return;
      }

      if (product.type === "asset") {
        const matching = available.filter((u) => u.type === "instance");
        if (matching.length === 0) {
          void triggerHaptic("error");
          Alert.alert("提示", `「${product.name}」没有可用的资产库存`);
          return;
        }
        Alert.alert(
          "选择资产",
          "请确认SN或扫描SN条码",
          matching
            .slice(0, 8)
            .map((u) => ({
              text: formatUnitOption(u),
              onPress: () => addUnitToItems(u),
            }))
            .concat([
              {
                text: "扫描SN",
                onPress: () => {
                  setSnProductContext(product);
                  setScanningSN(true);
                },
              },
              { text: "取消", onPress: () => {} },
            ]),
        );
      } else {
        const matching = available.filter((u) => u.type === "batch");
        if (matching.length === 0) {
          void triggerHaptic("error");
          Alert.alert("提示", `「${product.name}」没有可用库存`);
          return;
        }
        Alert.alert(
          "确认库存单元",
          `为「${product.name}」选择库存单元`,
          matching
            .slice(0, 8)
            .map((u) => ({
              text: `${formatUnitOption(u)} (${translateInventoryUnitType(u.type)})`,
              onPress: () => addUnitToItems(u),
            }))
            .concat([{ text: "取消", onPress: () => {} }]),
        );
      }
    },
    [addUnitToItems, isUnitAlreadySelected],
  );

  useEffect(() => {
    if (!params.scanProductId || products.length === 0) return;
    if (handledScanProductIdRef.current === params.scanProductId) return;
    const productId = Number(params.scanProductId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      handledScanProductIdRef.current = params.scanProductId;
      void handleScannedProduct(product);
    }
  }, [params.scanProductId, products, handleScannedProduct]);

  const onScan = useCallback(
    (barcode: string) => {
      setScanning(false);
      const product = products.find((p) => p.barcode === barcode);
      if (!product) {
        void triggerHaptic("error");
        Alert.alert("条码未录入", "该产品不存在", [
          { text: "确定", onPress: () => {} },
          {
            text: "建档",
            onPress: () =>
              router.push({
                pathname: "/entry/product",
                params: { barcode, returnTo: "sale" },
              } as any),
          },
        ]);
        return;
      }
      void handleScannedProduct(product);
    },
    [handleScannedProduct, products, router, setScanning],
  );

  const handleSNScan = useCallback(
    async (sn: string) => {
      setScanningSN(false);
      const product = snProductContext;
      setSnProductContext(null);
      if (!product) {
        void triggerHaptic("error");
        Alert.alert("提示", "请先扫描商品，再扫描SN");
        return;
      }

      try {
        const allUnits = await findSellableUnitsForProduct(product);
        const available = allUnits.filter(
          (u) => u.type === "instance" && matchesUnitCode(u, sn),
        );
        if (available.length > 0) {
          addUnitToItems(available[0]);
        } else {
          void triggerHaptic("error");
          Alert.alert(
            "未找到",
            `「${product.name}」下未找到SN为「${sn}」的可用库存单元`,
          );
        }
      } catch (err) {
        console.error(err);
        void triggerHaptic("error");
        Alert.alert("查询失败", "库存单元查询失败，请稍后重试");
      }
    },
    [addUnitToItems, snProductContext],
  );

  const handleSubmit = async () => {
    if (!selectedPartnerId) {
      void triggerHaptic("error");
      Alert.alert("提示", "请选择客户");
      return;
    }
    if (form.items.length === 0) {
      void triggerHaptic("error");
      Alert.alert("提示", "请扫描或添加库存单元");
      return;
    }
    for (const item of form.items) {
      const qty = Number(item.quantity);
      if (!item.quantity || Number.isNaN(qty) || qty <= 0) {
        void triggerHaptic("error");
        Alert.alert("提示", `${item.title} 的数量需大于 0`);
        return;
      }
      if (item.remainingQuantity != null && qty > item.remainingQuantity) {
        void triggerHaptic("error");
        Alert.alert(
          "提示",
          `${item.title} 的出库数量不能超过可用库存 ${item.remainingQuantity}`,
        );
        return;
      }
      if (
        !item.unitPrice ||
        Number.isNaN(Number(item.unitPrice)) ||
        Number(item.unitPrice) < 0
      ) {
        void triggerHaptic("error");
        Alert.alert("提示", `${item.title} 的单价不能为负`);
        return;
      }
    }

    const discount = discountFactor ? Number(discountFactor) : 1;
    if (
      discountFactor &&
      (Number.isNaN(discount) || discount <= 0 || discount > 1)
    ) {
      void triggerHaptic("error");
      Alert.alert("提示", "折扣系数需大于 0 且不超过 1");
      return;
    }

    setSubmitting(true);
    try {
      await createSaleOrder({
        customerId: selectedPartnerId,
        orderDate: form.orderDate,
        items: form.items,
        discountFactor: discount,
        note: form.note,
      });
      await draft.clearOnSuccess();
      void triggerHaptic("success");
      Alert.alert("出库成功", "销售单已提交", [
        {
          text: "继续出库",
          onPress: () => {
            form.resetForm();
            draft.resetDraftId();
            setDiscountFactor("");
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
    return <LoadingState message="正在准备出库资料..." />;
  }

  if (scanning) {
    return (
      <BarcodeScanner
        onScan={onScan}
        onClose={() => setScanning(false)}
        title="出库扫码"
      />
    );
  }

  if (scanningSN) {
    return (
      <BarcodeScanner
        onScan={handleSNScan}
        onClose={() => setScanningSN(false)}
        title="扫描资产SN"
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
              <StepTitle step="01" title="客户" desc="确认本次出库去向" />
              <PartnerChipSelector
                partners={partners}
                selectedId={selectedPartnerId}
                onSelect={(id) => setSelectedPartnerId(id)}
                label="选择客户"
              />
            </CardContent>
          </AnimatedCard>

          <AnimatedCard index={1}>
            <CardContent className="gap-4 px-4 py-4">
              <StepTitle
                step="02"
                title="添加库存"
                desc="扫码产品条码，或手动选择可售库存单元"
              />
              <ScanButton
                label="扫码出库"
                onPress={() => setScanning(true)}
                onManualSelect={() => setShowProductSelector(true)}
              />
            </CardContent>
          </AnimatedCard>

          {form.items.length > 0 ? (
            <View className="gap-3">
              <StepTitle
                step="03"
                title="出库明细"
                desc="核对数量、单价和可用库存"
              />
              {form.items.map((item, idx) => (
                <OrderItemCard
                  key={item.inventoryUnitId}
                  title={item.title}
                  quantity={item.quantity}
                  unitPrice={item.unitPrice}
                  onQuantityChange={(v) => form.updateItem(idx, "quantity", v)}
                  onUnitPriceChange={(v) => form.updateItem(idx, "unitPrice", v)}
                  onDelete={() => form.removeItem(idx)}
                />
              ))}
            </View>
          ) : (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-5 py-8">
              <Ionicons
                name="file-tray-outline"
                size={32}
                color={THEME.light.mutedForeground}
              />
              <Text className="text-sm font-semibold">还没有出库库存</Text>
              <Text className="text-center text-xs text-muted-foreground">
                扫描产品后选择库存批次或资产 SN
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
            extraFields={
              <View className="gap-2">
                <Text className="text-xs font-medium text-muted-foreground">
                  折扣系数
                </Text>
                <Input
                  className="h-11 bg-background"
                  value={discountFactor}
                  onChangeText={setDiscountFactor}
                  keyboardType="numeric"
                  placeholder="默认 1（不打折）"
                />
              </View>
            }
          />
        </ScrollView>

        <OrderBottomBar
          itemCount={form.items.length}
          totalAmount={form.totalAmount}
          submitting={submitting}
          submitLabel="提交出库"
          onSubmit={handleSubmit}
        />
      </KeyboardAvoidingView>

      <InventoryUnitSelector
        visible={showProductSelector}
        selectedIds={form.items.map((i) => i.inventoryUnitId)}
        onSelect={(unit) => addUnitToItems(unit)}
        onClose={() => setShowProductSelector(false)}
      />
    </SafeAreaView>
  );
}

function EntryHeader() {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
          <Ionicons
            name="arrow-up-outline"
            size={18}
            color={THEME.light.accent}
          />
        </View>
        <View>
          <Text className="text-base font-bold">销售出库</Text>
          <Text className="text-xs text-muted-foreground">先选客户，再扫码</Text>
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
      <View className="rounded-lg bg-accent/10 px-2 py-1">
        <Text className="text-xs font-bold text-accent">{step}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold">{title}</Text>
        <Text className="mt-1 text-xs text-muted-foreground">{desc}</Text>
      </View>
    </View>
  );
}
