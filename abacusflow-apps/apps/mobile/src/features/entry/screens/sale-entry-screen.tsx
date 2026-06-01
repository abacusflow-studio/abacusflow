import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  COLORS,
  translateInventoryUnitType,
} from "@abacusflow/utils";
import type { SelectableProduct, BasicInventoryUnit } from "@abacusflow/core";
import { BarcodeScanner } from "@components/ui/barcode-scanner";

import type { SaleOrderItem, PartnerOption } from "../types";
import { createSaleOrder } from "../services/order-service";
import { loadSaleSelectionData } from "../services/selection-service";
import {
  findSellableUnitsForProduct,
} from "@features/inventory/services/inventory-service";
import { useDraftPersistence } from "../hooks/use-draft-persistence";
import { useBarcodeScanning } from "../hooks/use-barcode-scanning";
import { useOrderForm } from "../hooks/use-order-form";
import { PartnerChipSelector } from "../components/partner-chip-selector";
import { OrderItemCard } from "../components/order-item-card";
import { OrderBottomBar } from "../components/order-bottom-bar";
import { MoreOptionsSection } from "../components/more-options-section";
import { ScanButton } from "../components/scan-button";

const isSellableUnit = (unit: BasicInventoryUnit) =>
  (unit.status === "normal" || unit.status === "reversed") &&
  unit.remainingQuantity > 0;

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
  const { scanning, setScanning, handleScan } = useBarcodeScanning(products);

  // 加载数据
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

  // 恢复草稿
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

  // 自动保存草稿
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
        Alert.alert("提示", `「${unit.title}」已在明细中`);
        return;
      }
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
        Alert.alert("查询失败", "库存单元查询失败，请稍后重试");
        return;
      }

      if (product.type === "asset") {
        const matching = available.filter((u) => u.type === "instance");
        if (matching.length === 0) {
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

  // 自动添加扫码产品
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
    [handleScannedProduct, products, router],
  );

  const handleSNScan = useCallback(
    async (sn: string) => {
      setScanningSN(false);
      const product = snProductContext;
      setSnProductContext(null);
      if (!product) {
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
          Alert.alert(
            "未找到",
            `「${product.name}」下未找到SN为「${sn}」的可用库存单元`,
          );
        }
      } catch (err) {
        console.error(err);
        Alert.alert("查询失败", "库存单元查询失败，请稍后重试");
      }
    },
    [addUnitToItems, snProductContext],
  );

  const handleSubmit = async () => {
    if (!selectedPartnerId) {
      Alert.alert("提示", "请选择客户");
      return;
    }
    if (form.items.length === 0) {
      Alert.alert("提示", "请扫描或添加库存单元");
      return;
    }
    // 校验数量不超过可用库存
    for (const item of form.items) {
      const qty = Number(item.quantity);
      if (!item.quantity || Number.isNaN(qty) || qty <= 0) {
        Alert.alert("提示", `${item.title} 的数量需大于 0`);
        return;
      }
      if (item.remainingQuantity != null && qty > item.remainingQuantity) {
        Alert.alert(
          "提示",
          `${item.title} 的出库数量不能超过可用库存 ${item.remainingQuantity}`,
        );
        return;
      }
      if (!item.unitPrice || Number.isNaN(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
        Alert.alert("提示", `${item.title} 的单价不能为负`);
        return;
      }
    }

    const discount = discountFactor ? Number(discountFactor) : 1;
    if (
      discountFactor &&
      (Number.isNaN(discount) || discount <= 0 || discount > 1)
    ) {
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
      Alert.alert("出库成功", "销售单已提交", [
        { text: "继续出库", onPress: () => { form.resetForm(); draft.resetDraftId(); setDiscountFactor(""); } },
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
            label="1. 选择客户"
          />

          <Text style={styles.stepLabel}>2. 扫描商品</Text>
          <ScanButton label="扫码出库" onPress={() => setScanning(true)} />

          {form.items.length > 0 && (
            <View style={styles.itemsSection}>
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
          )}

          <MoreOptionsSection
            showMore={form.showMore}
            onToggle={() => form.setShowMore(!form.showMore)}
            orderDate={form.orderDate}
            onOrderDateChange={form.setOrderDate}
            note={form.note}
            onNoteChange={form.setNote}
            extraFields={
              <>
                <Text style={styles.fieldLabel}>折扣系数</Text>
                <TextInput
                  style={styles.input}
                  value={discountFactor}
                  onChangeText={setDiscountFactor}
                  keyboardType="numeric"
                  placeholder="默认 1（不打折）"
                />
              </>
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
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 44,
  },
});
