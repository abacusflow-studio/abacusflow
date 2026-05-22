import React, { useState, useEffect } from "react";
import {
  StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { BasicProduct } from "@abacusflow/core";
import { dateToFormattedString, COLORS } from "@abacusflow/utils";

interface Partner {
  id: number;
  name: string;
}

interface ItemRow {
  productId: number | undefined;
  quantity: string;
  unitPrice: string;
}

interface OrderFormScreenProps {
  orderType: "purchase" | "sale";
  partnerLabel: string;
  accentColor?: string;
  loadPartners: () => Promise<Partner[]>;
  loadProducts: () => Promise<BasicProduct[]>;
  extraFields?: React.ReactNode;
  buildSubmitData: (params: {
    partnerId: number;
    orderDate: string;
    items: { productId: number; quantity: number; unitPrice: number }[];
  }) => Promise<void>;
}

export function OrderFormScreen({
  orderType,
  partnerLabel,
  accentColor = COLORS.primary,
  loadPartners,
  loadProducts,
  extraFields,
  buildSubmitData,
}: OrderFormScreenProps) {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [products, setProducts] = useState<BasicProduct[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | undefined>();
  const [orderDate, setOrderDate] = useState(dateToFormattedString(new Date().toISOString()));
  const [items, setItems] = useState<ItemRow[]>([{ productId: undefined, quantity: "", unitPrice: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [partnerRes, productRes] = await Promise.all([loadPartners(), loadProducts()]);
      setPartners(partnerRes);
      setProducts(productRes);
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
    if (!selectedPartnerId) {
      Alert.alert("提示", `请选择${partnerLabel}`);
      return;
    }
    const validItems = items.filter((item) => item.productId && item.quantity && item.unitPrice);
    if (validItems.length === 0) {
      Alert.alert("提示", "请至少添加一个订单项");
      return;
    }

    setSubmitting(true);
    try {
      await buildSubmitData({
        partnerId: selectedPartnerId,
        orderDate,
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
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>{partnerLabel} *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
          {partners.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.optionChip, selectedPartnerId === p.id && { borderColor: accentColor, backgroundColor: accentColor + "15" }]}
              onPress={() => setSelectedPartnerId(p.id)}
            >
              <Text style={[styles.optionChipText, selectedPartnerId === p.id && { color: accentColor, fontWeight: "600" }]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>订单日期</Text>
        <TextInput style={styles.input} value={orderDate} onChangeText={setOrderDate} placeholder="YYYY-MM-DD" />

        {extraFields}

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
                  style={[styles.optionChip, item.productId === p.id && { borderColor: accentColor, backgroundColor: accentColor + "15" }]}
                  onPress={() => updateItem(idx, "productId", p.id)}
                >
                  <Text style={[styles.optionChipText, item.productId === p.id && { color: accentColor, fontWeight: "600" }]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.itemRow}>
              <View style={styles.itemField}>
                <Text style={styles.fieldLabel}>数量</Text>
                <TextInput style={styles.input} value={item.quantity} onChangeText={(v) => updateItem(idx, "quantity", v)} keyboardType="numeric" placeholder="0" />
              </View>
              <View style={styles.itemField}>
                <Text style={styles.fieldLabel}>单价</Text>
                <TextInput style={styles.input} value={item.unitPrice} onChangeText={(v) => updateItem(idx, "unitPrice", v)} keyboardType="numeric" placeholder="0.00" />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.addItemBtn, { borderColor: accentColor }]} onPress={addItem}>
          <Text style={[styles.addItemBtnText, { color: accentColor }]}>+ 添加商品</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: accentColor }, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>创建{orderType === "purchase" ? "采购" : "销售"}单</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 8, marginTop: 16 },
  fieldLabel: { fontSize: 12, color: COLORS.textTertiary, marginBottom: 4, marginTop: 8 },
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
  optionScroll: { marginBottom: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderInput,
    backgroundColor: COLORS.bgCard,
    marginRight: 8,
  },
  optionChipText: { fontSize: 13, color: COLORS.textSecondary },
  itemCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  removeItem: { fontSize: 13, color: COLORS.danger },
  itemRow: { flexDirection: "row", gap: 12 },
  itemField: { flex: 1 },
  addItemBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    marginBottom: 16,
  },
  addItemBtnText: { fontSize: 14, fontWeight: "600" },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
