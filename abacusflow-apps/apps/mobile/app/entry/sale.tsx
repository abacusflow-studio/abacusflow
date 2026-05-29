import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  partnerApi,
  inventoryApi,
  productApi,
  transactionApi,
  type SelectableInventoryUnit,
  type SelectableProduct,
} from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";
import {
  dateToFormattedString,
  translateInventoryUnitType,
} from "@abacusflow/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { saveDraft, deleteDraft, listDrafts } from "@/lib/draft-store";

interface SaleItem {
  inventoryUnitId: number;
  title: string;
  quantity: string;
  unitPrice: string;
}

export default function SaleEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    scanProductId?: string;
    scanBarcode?: string;
    draftId?: string;
  }>();

  const [scanning, setScanning] = useState(false);
  const [scanningSN, setScanningSN] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(params.draftId);

  const [partners, setPartners] = useState<{ id: number; name: string }[]>([]);
  const [inventoryUnits, setInventoryUnits] = useState<
    SelectableInventoryUnit[]
  >([]);
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<
    number | undefined
  >();
  const [orderDate, setOrderDate] = useState(
    dateToFormattedString(new Date().toISOString()),
  );
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discountFactor, setDiscountFactor] = useState("");
  const [note, setNote] = useState("");
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Restore draft
  useEffect(() => {
    if (params.draftId && partners.length > 0) {
      restoreDraft(params.draftId);
    }
  }, [params.draftId, partners]);

  // Auto-add from scan
  useEffect(() => {
    if (
      params.scanProductId &&
      inventoryUnits.length > 0 &&
      products.length > 0
    ) {
      const pid = Number(params.scanProductId);
      const product = products.find((p) => p.id === pid);
      if (product) {
        handleScannedProduct(product);
      }
    }
  }, [params.scanProductId, inventoryUnits, products]);

  const loadData = async () => {
    try {
      const [partnerRes, unitRes, productRes] = await Promise.all([
        partnerApi.listSelectableCustomers(),
        inventoryApi.listSelectableInventoryUnits({
          statuses: ["normal", "reversed"],
        }),
        productApi.listSelectableProducts(),
      ]);
      setPartners(partnerRes.map((p) => ({ id: p.id, name: p.name })));
      setInventoryUnits(unitRes);
      setProducts(productRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const restoreDraft = async (id: string) => {
    const drafts = await listDrafts("sale");
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    const p = draft.payload;
    setSelectedPartnerId(p.customerId as number | undefined);
    setOrderDate((p.orderDate as string) || orderDate);
    setItems((p.items as SaleItem[]) || []);
    setDiscountFactor((p.discountFactor as string) || "");
    setNote((p.note as string) || "");
    setDraftId(id);
  };

  const autoSaveDraft = useCallback(
    async (currentItems: SaleItem[], currentPartner?: number) => {
      if (currentItems.length === 0) return;
      const summary = `${currentItems.length} 个库存单元`;
      const payload = {
        customerId: currentPartner,
        orderDate,
        items: currentItems,
        discountFactor,
        note,
      };
      if (draftId) {
        const { updateDraft } = await import("@/lib/draft-store");
        await updateDraft("sale", draftId, { payload, summary });
      } else {
        const draft = await saveDraft("sale", payload, summary);
        setDraftId(draft.id);
      }
    },
    [draftId, orderDate, discountFactor, note],
  );

  const addUnitToItems = (unit: SelectableInventoryUnit) => {
    if (items.some((i) => i.inventoryUnitId === unit.id)) {
      Alert.alert("提示", `「${unit.title}」已在明细中`);
      return;
    }
    const newItems = [
      ...items,
      {
        inventoryUnitId: unit.id,
        title: unit.title,
        quantity: "1",
        unitPrice: "",
      },
    ];
    setItems(newItems);
    autoSaveDraft(newItems, selectedPartnerId);
  };

  const handleScannedProduct = (product: SelectableProduct) => {
    const available = inventoryUnits.filter(
      (u) => u.status === "normal" || u.status === "reversed",
    );

    if (product.type === "asset") {
      // Asset: must select SN
      const matching = available.filter(
        (u) =>
          u.type === "instance" &&
          !items.some((i) => i.inventoryUnitId === u.id),
      );
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
            text: u.title,
            onPress: () => addUnitToItems(u),
          }))
          .concat([
            { text: "扫描SN", onPress: () => setScanningSN(true) },
            { text: "取消", onPress: () => {} },
          ]),
      );
    } else {
      // Material: must match by product context
      // Since SelectableInventoryUnit lacks productId, show selection
      const matching = available.filter(
        (u) =>
          u.type === "batch" && !items.some((i) => i.inventoryUnitId === u.id),
      );
      if (matching.length === 0) {
        Alert.alert("提示", `「${product.name}」没有可用库存`);
        return;
      }
      // Show selection for user to confirm - don't silently pick first
      Alert.alert(
        "确认库存单元",
        `为「${product.name}」选择库存单元`,
        matching
          .slice(0, 8)
          .map((u) => ({
            text: `${u.title} (${translateInventoryUnitType(u.type)})`,
            onPress: () => addUnitToItems(u),
          }))
          .concat([{ text: "取消", onPress: () => {} }]),
      );
    }
  };

  const handleScan = useCallback(
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
      handleScannedProduct(product);
    },
    [products, inventoryUnits, items],
  );

  const handleSNScan = useCallback(
    (sn: string) => {
      setScanningSN(false);
      const unit = inventoryUnits.find(
        (u) =>
          (u.status === "normal" || u.status === "reversed") &&
          u.title.includes(sn),
      );
      if (unit) {
        addUnitToItems(unit);
      } else {
        Alert.alert("未找到", `未找到SN为「${sn}」的库存单元`);
      }
    },
    [inventoryUnits, items],
  );

  const updateItem = (index: number, field: keyof SaleItem, value: string) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    setItems(newItems);
    autoSaveDraft(newItems, selectedPartnerId);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    autoSaveDraft(newItems, selectedPartnerId);
  };

  const totalAmount = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const handleSubmit = async () => {
    if (!selectedPartnerId) {
      Alert.alert("提示", "请选择客户");
      return;
    }
    if (items.length === 0) {
      Alert.alert("提示", "请扫描或添加库存单元");
      return;
    }
    for (const item of items) {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      if (!item.quantity || Number.isNaN(qty) || qty <= 0) {
        Alert.alert("提示", `${item.title} 的数量需大于 0`);
        return;
      }
      if (!item.unitPrice || Number.isNaN(price) || price < 0) {
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
      await transactionApi.addSaleOrder({
        createSaleOrderInput: {
          customerId: selectedPartnerId,
          orderDate: new Date(`${orderDate}T00:00:00`),
          note: note.trim() || undefined,
          orderItems: items.map((item) => ({
            inventoryUnitId: item.inventoryUnitId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discountFactor: discount,
          })),
        },
      });
      if (draftId) await deleteDraft("sale", draftId);
      Alert.alert("出库成功", "销售单已提交", [
        { text: "继续出库", onPress: () => resetForm() },
        { text: "回到录入", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "提交失败";
      if (draftId) {
        const { updateDraft } = await import("@/lib/draft-store");
        await updateDraft("sale", draftId, {
          status: "failed",
          lastError: msg,
        });
      }
      Alert.alert("提交失败", msg + "\n\n已保存草稿，可稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedPartnerId(undefined);
    setItems([]);
    setDiscountFactor("");
    setNote("");
    setDraftId(undefined);
    setOrderDate(dateToFormattedString(new Date().toISOString()));
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
        onScan={handleScan}
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
          {/* Step 1: Customer */}
          <Text style={styles.stepLabel}>1. 选择客户</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
          >
            {partners.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.chip,
                  selectedPartnerId === p.id && styles.chipActive,
                ]}
                onPress={() => {
                  setSelectedPartnerId(p.id);
                  autoSaveDraft(items, p.id);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedPartnerId === p.id && styles.chipTextActive,
                  ]}
                >
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Step 2: Scan */}
          <Text style={styles.stepLabel}>2. 扫描商品</Text>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => setScanning(true)}
          >
            <Ionicons name="scan" size={22} color="#fff" />
            <Text style={styles.scanBtnText}>扫码出库</Text>
          </TouchableOpacity>

          {/* Items */}
          {items.length > 0 && (
            <View style={styles.itemsSection}>
              {items.map((item, idx) => (
                <View key={item.inventoryUnitId} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteHit}
                      onPress={() => removeItem(idx)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={COLORS.danger}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.itemRow}>
                    <View style={styles.itemField}>
                      <Text style={styles.fieldLabel}>数量</Text>
                      <TextInput
                        style={styles.input}
                        value={item.quantity}
                        onChangeText={(v) => updateItem(idx, "quantity", v)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.itemField}>
                      <Text style={styles.fieldLabel}>单价</Text>
                      <TextInput
                        style={styles.input}
                        value={item.unitPrice}
                        onChangeText={(v) => updateItem(idx, "unitPrice", v)}
                        keyboardType="numeric"
                        placeholder="0.00"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* More */}
          <TouchableOpacity
            style={styles.moreToggle}
            onPress={() => setShowMore(!showMore)}
          >
            <Text style={styles.moreToggleText}>
              {showMore ? "收起" : "更多信息"}
            </Text>
            <Ionicons
              name={showMore ? "chevron-up" : "chevron-down"}
              size={16}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>

          {showMore && (
            <>
              <Text style={styles.fieldLabel}>折扣系数</Text>
              <TextInput
                style={styles.input}
                value={discountFactor}
                onChangeText={setDiscountFactor}
                keyboardType="numeric"
                placeholder="默认 1（不打折）"
              />
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                订单日期
              </Text>
              <TextInput
                style={styles.input}
                value={orderDate}
                onChangeText={setOrderDate}
                placeholder="YYYY-MM-DD"
              />
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>备注</Text>
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder="可选备注"
              />
            </>
          )}
        </ScrollView>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomCount}>{items.length} 项</Text>
            <Text style={styles.bottomTotal}>
              ¥{totalAmount.toLocaleString("zh-CN")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>提交出库</Text>
            )}
          </TouchableOpacity>
        </View>
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
  chipScroll: { marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    marginRight: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  chipText: { fontSize: 14, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontWeight: "600" },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  itemsSection: { gap: 12, marginBottom: 12 },
  itemCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemName: { fontSize: 15, fontWeight: "600", color: COLORS.text, flex: 1 },
  deleteHit: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  itemRow: { flexDirection: "row", gap: 12 },
  itemField: { flex: 1 },
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
  moreToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    marginBottom: 8,
  },
  moreToggleText: { fontSize: 13, color: COLORS.textTertiary },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomInfo: { flex: 1 },
  bottomCount: { fontSize: 13, color: COLORS.textSecondary },
  bottomTotal: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 120,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
