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
import { partnerApi, productApi, transactionApi, type SelectableProduct } from "@abacusflow/core";
import { COLORS, dateToFormattedString } from "@abacusflow/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";

interface OrderItem {
  productId: number;
  productName: string;
  barcode: string;
  quantity: string;
  unitPrice: string;
}

export default function AddPurchaseOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scanProductId?: string; scanBarcode?: string }>();

  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [partners, setPartners] = useState<{ id: number; name: string }[]>([]);
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | undefined>();
  const [orderDate, setOrderDate] = useState(dateToFormattedString(new Date().toISOString()));
  const [items, setItems] = useState<OrderItem[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // Auto-add scanned product
  useEffect(() => {
    if (params.scanProductId && products.length > 0) {
      const pid = Number(params.scanProductId);
      const product = products.find((p) => p.id === pid);
      if (product && !items.some((i) => i.productId === pid)) {
        setItems((prev) => [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            barcode: product.barcode,
            quantity: "1",
            unitPrice: "",
          },
        ]);
      }
    }
  }, [params.scanProductId, products]);

  const loadData = async () => {
    try {
      const [partnerRes, productRes] = await Promise.all([
        partnerApi.listSelectableSuppliers(),
        productApi.listSelectableProducts(),
      ]);
      setPartners(partnerRes.map((p) => ({ id: p.id, name: p.name })));
      setProducts(productRes);
    } catch (err) {
      console.error(err);
      Alert.alert("错误", "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = useCallback(
    (barcode: string) => {
      setScanning(false);
      const product = products.find((p) => p.barcode === barcode);
      if (product) {
        if (items.some((i) => i.productId === product.id)) {
          Alert.alert("提示", `「${product.name}」已在订单中`);
          return;
        }
        setItems((prev) => [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            barcode: product.barcode,
            quantity: "1",
            unitPrice: "",
          },
        ]);
      } else {
        Alert.alert("未找到", "该条码对应的产品不存在，是否先新增产品？", [
          { text: "取消", style: "cancel" },
          {
            text: "新增产品",
            onPress: () =>
              router.push({ pathname: "/product/add", params: { barcode } } as any),
          },
        ]);
      }
    },
    [products, items],
  );

  const handleManualAdd = () => {
    // Show product selection as fallback
    Alert.alert(
      "选择产品",
      undefined,
      products
        .filter((p) => !items.some((i) => i.productId === p.id))
        .slice(0, 10)
        .map((p) => ({
          text: `${p.name} (${p.barcode})`,
          onPress: () => {
            setItems((prev) => [
              ...prev,
              {
                productId: p.id,
                productName: p.name,
                barcode: p.barcode,
                quantity: "1",
                unitPrice: "",
              },
            ]);
          },
        }))
        .concat([{ text: "取消", onPress: () => {} }]),
    );
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedPartnerId) {
      Alert.alert("提示", "请选择供应商");
      return;
    }
    if (items.length === 0) {
      Alert.alert("提示", "请至少添加一个产品");
      return;
    }
    for (const item of items) {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      if (!item.quantity || Number.isNaN(qty) || qty <= 0) {
        Alert.alert("提示", `${item.productName} 的数量需大于 0`);
        return;
      }
      if (!item.unitPrice || Number.isNaN(price) || price < 0) {
        Alert.alert("提示", `${item.productName} 的单价不能为负`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await transactionApi.addPurchaseOrder({
        createPurchaseOrderInput: {
          supplierId: selectedPartnerId,
          orderDate: new Date(`${orderDate}T00:00:00`),
          note: note.trim() || undefined,
          orderItems: items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
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
        <ActivityIndicator size="large" color={COLORS.primary} />
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Supplier Selection */}
        <Text style={styles.sectionLabel}>供应商</Text>
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
          <Text style={styles.sectionLabel}>产品明细</Text>
          <Text style={styles.itemCount}>{items.length} 项</Text>
        </View>

        {items.map((item, idx) => (
          <View key={item.productId} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemBarcode}>{item.barcode}</Text>
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
            <Ionicons name="scan" size={18} color="#1677ff" />
            <Text style={[styles.addBtnText, { color: "#1677ff" }]}>扫码添加</Text>
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
            <Text style={styles.submitText}>创建采购单</Text>
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
    borderColor: COLORS.primary,
    backgroundColor: "#e6f4ff",
  },
  chipText: { fontSize: 13, color: "#666" },
  chipTextActive: { color: COLORS.primary, fontWeight: "600" },
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
  itemBarcode: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
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
    borderColor: COLORS.primary,
    backgroundColor: "#e6f4ff",
  },
  manualAddBtn: {
    borderColor: "#e8e8e8",
    backgroundColor: "#fafafa",
  },
  addBtnText: { fontSize: 14, fontWeight: "600" },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
