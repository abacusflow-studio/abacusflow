import { useState, useEffect } from "react";
import {
  StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { transactionApi, customerApi, productApi, type Customer, type BasicProduct } from "@abacusflow/core";
import { dateToFormattedString } from "@abacusflow/utils";

interface ItemRow {
  productId: number | undefined;
  quantity: string;
  unitPrice: string;
}

export default function AddSaleOrderScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<BasicProduct[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>();
  const [orderDate, setOrderDate] = useState(dateToFormattedString(new Date().toISOString()));
  const [discountFactor, setDiscountFactor] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ productId: undefined, quantity: "", unitPrice: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customerRes, productRes] = await Promise.all([
        customerApi.listCustomersPage({ pageIndex: 1, pageSize: 100 }),
        productApi.listBasicProductsPage({ pageIndex: 1, pageSize: 100 }),
      ]);
      setCustomers(customerRes.content);
      setProducts(productRes.content);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string | number | undefined) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { productId: undefined, quantity: "", unitPrice: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      Alert.alert("提示", "请选择客户");
      return;
    }
    const validItems = items.filter((item) => item.productId && item.quantity && item.unitPrice);
    if (validItems.length === 0) {
      Alert.alert("提示", "请至少添加一个订单项");
      return;
    }

    setSubmitting(true);
    try {
      await transactionApi.createSaleOrder({
        customerId: selectedCustomerId,
        orderDate,
        discountFactor: discountFactor ? Number(discountFactor) : undefined,
        items: validItems.map((item) => ({
          productId: item.productId!,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
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
        <ActivityIndicator size="large" color="#1677ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Customer Selection */}
        <Text style={styles.label}>客户 *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
          {customers.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.optionChip, selectedCustomerId === c.id && styles.optionChipActive]}
              onPress={() => setSelectedCustomerId(c.id)}
            >
              <Text style={[styles.optionChipText, selectedCustomerId === c.id && styles.optionChipTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Order Date */}
        <Text style={styles.label}>订单日期</Text>
        <TextInput style={styles.input} value={orderDate} onChangeText={setOrderDate} placeholder="YYYY-MM-DD" />

        {/* Discount */}
        <Text style={styles.label}>折扣系数</Text>
        <TextInput
          style={styles.input}
          value={discountFactor}
          onChangeText={setDiscountFactor}
          keyboardType="numeric"
          placeholder="例如: 0.9 表示九折"
        />

        {/* Order Items */}
        <Text style={styles.label}>订单明细</Text>
        {items.map((item, idx) => (
          <View key={idx} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>商品 {idx + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(idx)}>
                  <Text style={styles.removeItem}>删除</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.fieldLabel}>产品</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {products.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.optionChip, item.productId === p.id && styles.optionChipActive]}
                  onPress={() => updateItem(idx, "productId", p.id)}
                >
                  <Text style={[styles.optionChipText, item.productId === p.id && styles.optionChipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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

        <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
          <Text style={styles.addItemBtnText}>+ 添加商品</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>创建销售单</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8, marginTop: 16 },
  fieldLabel: { fontSize: 12, color: "#999", marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9d9d9",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  optionScroll: { marginBottom: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d9d9d9",
    backgroundColor: "#fff",
    marginRight: 8,
  },
  optionChipActive: { borderColor: "#1677ff", backgroundColor: "#e6f4ff" },
  optionChipText: { fontSize: 13, color: "#666" },
  optionChipTextActive: { color: "#1677ff", fontWeight: "600" },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  removeItem: { fontSize: 13, color: "#ff4d4f" },
  itemRow: { flexDirection: "row", gap: 12 },
  itemField: { flex: 1 },
  addItemBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#722ed1",
    borderStyle: "dashed",
    alignItems: "center",
    marginBottom: 16,
  },
  addItemBtnText: { color: "#722ed1", fontSize: 14, fontWeight: "600" },
  submitBtn: {
    backgroundColor: "#722ed1",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
