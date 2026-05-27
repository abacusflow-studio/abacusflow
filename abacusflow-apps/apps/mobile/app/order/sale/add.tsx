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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  partnerApi,
  inventoryApi,
  transactionApi,
  productApi,
  type SelectableInventoryUnit,
  type SelectableProduct,
} from "@abacusflow/core";
import {
  COLORS,
  dateToFormattedString,
  translateInventoryUnitType,
} from "@abacusflow/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";

interface SaleOrderItem {
  inventoryUnitId: number;
  title: string;
  quantity: string;
  unitPrice: string;
}

export default function AddSaleOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scanProductId?: string; scanBarcode?: string }>();

  const [scanning, setScanning] = useState(false);
  const [scanningSN, setScanningSN] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [partners, setPartners] = useState<{ id: number; name: string }[]>([]);
  const [inventoryUnits, setInventoryUnits] = useState<SelectableInventoryUnit[]>([]);
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | undefined>();
  const [orderDate, setOrderDate] = useState(dateToFormattedString(new Date().toISOString()));
  const [items, setItems] = useState<SaleOrderItem[]>([]);
  const [discountFactor, setDiscountFactor] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // Auto-add from scan
  useEffect(() => {
    if (params.scanProductId && inventoryUnits.length > 0 && products.length > 0) {
      const pid = Number(params.scanProductId);
      const product = products.find((p) => p.id === pid);
      if (product) {
        const available = inventoryUnits.filter(
          (u) => u.status === "normal" || u.status === "reversed",
        );
        if (product.type === "asset") {
          // Asset: need SN selection
          promptAssetSNSelection(product.name, available);
        } else {
          // Material: pick first available unit
          const unit = available.find(
            (u) => !items.some((i) => i.inventoryUnitId === u.id),
          );
          if (unit) {
            addUnitToItems(unit);
          } else {
            Alert.alert("提示", `「${product.name}」没有可用库存`);
          }
        }
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
      Alert.alert("错误", "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const addUnitToItems = (unit: SelectableInventoryUnit) => {
    if (items.some((i) => i.inventoryUnitId === unit.id)) {
      Alert.alert("提示", `「${unit.title}」已在订单中`);
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        inventoryUnitId: unit.id,
        title: unit.title,
        quantity: "1",
        unitPrice: "",
      },
    ]);
  };

  const promptAssetSNSelection = (
    productName: string,
    available: SelectableInventoryUnit[],
  ) => {
    // For assets, filter to the specific product's units
    // Since SelectableInventoryUnit doesn't have productId, we match by title prefix
    const matching = available.filter(
      (u) =>
        u.type === "instance" &&
        !items.some((i) => i.inventoryUnitId === u.id),
    );

    if (matching.length === 0) {
      Alert.alert("提示", `「${productName}」没有可用的资产库存`);
      return;
    }

    Alert.alert(
      "选择资产",
      "请选择或扫描SN",
      matching
        .slice(0, 8)
        .map((u) => ({
          text: u.title,
          onPress: () => addUnitToItems(u),
        }))
        .concat([
          {
            text: "扫描SN",
            onPress: () => setScanningSN(true),
          },
          { text: "取消", onPress: () => {} },
        ]),
    );
  };

  const handleScan = useCallback(
    (barcode: string) => {
      setScanning(false);
      // Find product by barcode
      const product = products.find((p) => p.barcode === barcode);
      if (!product) {
        Alert.alert("未找到", "该条码对应的产品不存在", [
          { text: "确定", onPress: () => {} },
          {
            text: "新增产品",
            onPress: () =>
              router.push({ pathname: "/product/add", params: { barcode } } as any),
          },
        ]);
        return;
      }

      const available = inventoryUnits.filter(
        (u) => u.status === "normal" || u.status === "reversed",
      );

      if (product.type === "asset") {
        promptAssetSNSelection(product.name, available);
      } else {
        // Material: pick first available unit for this product
        const unit = available.find(
          (u) => !items.some((i) => i.inventoryUnitId === u.id),
        );
        if (unit) {
          addUnitToItems(unit);
        } else {
          Alert.alert("提示", `「${product.name}」没有可用库存`);
        }
      }
    },
    [products, inventoryUnits, items],
  );

  const handleSNScan = useCallback(
    (sn: string) => {
      setScanningSN(false);
      // Find inventory unit by serial number in title
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

  const handleManualAdd = () => {
    const available = inventoryUnits.filter(
      (u) =>
        (u.status === "normal" || u.status === "reversed") &&
        !items.some((i) => i.inventoryUnitId === u.id),
    );

    if (available.length === 0) {
      Alert.alert("提示", "没有可用库存");
      return;
    }

    Alert.alert(
      "选择库存单元",
      undefined,
      available
        .slice(0, 10)
        .map((u) => ({
          text: `${u.title} (${translateInventoryUnitType(u.type)})`,
          onPress: () => addUnitToItems(u),
        }))
        .concat([{ text: "取消", onPress: () => {} }]),
    );
  };

  const updateItem = (index: number, field: keyof SaleOrderItem, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedPartnerId) {
      Alert.alert("提示", "请选择客户");
      return;
    }
    if (items.length === 0) {
      Alert.alert("提示", "请至少添加一个库存单元");
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
    if (discountFactor && (Number.isNaN(discount) || discount <= 0 || discount > 1)) {
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
      router.back();
    } catch (err) {
      Alert.alert("错误", err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#722ed1" />
      </View>
    );
  }

  if (scanning) {
    return (
      <BarcodeScanner
        onScan={handleScan}
        onClose={() => setScanning(false)}
        title="扫描产品条码"
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
      <ScrollView contentContainerStyle={styles.content}>
        {/* Customer Selection */}
        <Text style={styles.sectionLabel}>客户</Text>
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
              onPress={() => setSelectedPartnerId(p.id)}
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

        {/* Order Date */}
        <Text style={styles.sectionLabel}>订单日期</Text>
        <TextInput
          style={styles.input}
          value={orderDate}
          onChangeText={setOrderDate}
          placeholder="YYYY-MM-DD"
        />

        {/* Discount */}
        <Text style={styles.sectionLabel}>折扣系数</Text>
        <TextInput
          style={styles.input}
          value={discountFactor}
          onChangeText={setDiscountFactor}
          keyboardType="numeric"
          placeholder="例如: 0.9 表示九折（默认 1）"
        />

        {/* Note */}
        <Text style={styles.sectionLabel}>备注</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="可选备注"
        />

        {/* Order Items */}
        <View style={styles.itemsHeader}>
          <Text style={styles.sectionLabel}>库存明细</Text>
          <Text style={styles.itemCount}>{items.length} 项</Text>
        </View>

        {items.map((item, idx) => (
          <View key={item.inventoryUnitId} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.title}</Text>
              </View>
              <TouchableOpacity onPress={() => removeItem(idx)}>
                <Ionicons name="trash-outline" size={20} color="#ff4d4f" />
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
                  placeholder="0"
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

        {/* Add buttons */}
        <View style={styles.addBtnRow}>
          <TouchableOpacity
            style={[styles.addBtn, styles.scanAddBtn]}
            onPress={() => setScanning(true)}
          >
            <Ionicons name="scan" size={18} color="#722ed1" />
            <Text style={[styles.addBtnText, { color: "#722ed1" }]}>扫码添加</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, styles.manualAddBtn]}
            onPress={handleManualAdd}
          >
            <Ionicons name="list-outline" size={18} color="#666" />
            <Text style={[styles.addBtnText, { color: "#666" }]}>手动选择</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>创建销售单</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    marginBottom: 8,
    marginTop: 16,
    paddingLeft: 4,
  },
  chipScroll: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    backgroundColor: "#fafafa",
    marginRight: 8,
  },
  chipActive: {
    borderColor: "#722ed1",
    backgroundColor: "#f9f0ff",
  },
  chipText: { fontSize: 13, color: "#666" },
  chipTextActive: { color: "#722ed1", fontWeight: "600" },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  itemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemCount: { fontSize: 13, color: "#999", marginTop: 16, marginRight: 4 },
  itemCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  itemRow: { flexDirection: "row", gap: 12 },
  itemField: { flex: 1 },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 4,
  },
  addBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  scanAddBtn: {
    borderColor: "#722ed1",
    backgroundColor: "#f9f0ff",
  },
  manualAddBtn: {
    borderColor: "#e8e8e8",
    backgroundColor: "#fafafa",
  },
  addBtnText: { fontSize: 14, fontWeight: "600" },
  submitBtn: {
    backgroundColor: "#722ed1",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
