import React, { useState, useEffect } from "react";
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
import { useRouter } from "expo-router";
import { dateToFormattedString } from "@abacusflow/utils";
import { COLORS } from "@abacusflow/ui-tokens";

interface Partner {
  id: number;
  name: string;
}

export interface OrderItemOption {
  id: number;
  label: string;
  detail?: string;
}

interface ItemRow {
  itemId: number | undefined;
  quantity: string;
  unitPrice: string;
}

interface OrderFormScreenProps {
  orderType: "purchase" | "sale";
  partnerLabel: string;
  itemLabel?: string;
  accentColor?: string;
  loadPartners: () => Promise<Partner[]>;
  loadItems: () => Promise<OrderItemOption[]>;
  extraFields?: React.ReactNode;
  buildSubmitData: (params: {
    partnerId: number;
    orderDate: Date;
    items: { itemId: number; quantity: number; unitPrice: number }[];
  }) => Promise<void>;
}

export function OrderFormScreen({
  orderType,
  partnerLabel,
  itemLabel = "产品",
  accentColor = COLORS.primary,
  loadPartners,
  loadItems,
  extraFields,
  buildSubmitData,
}: OrderFormScreenProps) {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [itemOptions, setItemOptions] = useState<OrderItemOption[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<
    number | undefined
  >();
  const [orderDate, setOrderDate] = useState(
    dateToFormattedString(new Date().toISOString()),
  );
  const [items, setItems] = useState<ItemRow[]>([
    { itemId: undefined, quantity: "", unitPrice: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [partnerRes, productRes] = await Promise.all([
        loadPartners(),
        loadItems(),
      ]);
      setPartners(partnerRes);
      setItemOptions(productRes);
    } catch (err) {
      console.error(err);
      Alert.alert("错误", "加载表单数据失败");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (
    index: number,
    field: keyof ItemRow,
    value: string | number | undefined,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { itemId: undefined, quantity: "", unitPrice: "" },
    ]);
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
    const orderDateValue = new Date(`${orderDate}T00:00:00`);
    if (Number.isNaN(orderDateValue.getTime())) {
      Alert.alert("提示", "请输入正确的订单日期");
      return;
    }

    const validItems = items.filter((item) => item.itemId);
    if (validItems.length === 0) {
      Alert.alert("提示", "请至少添加一个订单项");
      return;
    }

    for (const item of validItems) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!item.quantity || Number.isNaN(quantity) || quantity <= 0) {
        Alert.alert("提示", "请输入大于 0 的数量");
        return;
      }
      if (!item.unitPrice || Number.isNaN(unitPrice) || unitPrice < 0) {
        Alert.alert("提示", "请输入不小于 0 的单价");
        return;
      }
    }

    setSubmitting(true);
    try {
      await buildSubmitData({
        partnerId: selectedPartnerId,
        orderDate: orderDateValue,
        items: validItems.map((item) => ({
          itemId: item.itemId!,
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.optionScroll}
        >
          {partners.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.optionChip,
                selectedPartnerId === p.id && {
                  borderColor: accentColor,
                  backgroundColor: accentColor + "15",
                },
              ]}
              onPress={() => setSelectedPartnerId(p.id)}
            >
              <Text
                style={[
                  styles.optionChipText,
                  selectedPartnerId === p.id && {
                    color: accentColor,
                    fontWeight: "600",
                  },
                ]}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>订单日期</Text>
        <TextInput
          style={styles.input}
          value={orderDate}
          onChangeText={setOrderDate}
          placeholder="YYYY-MM-DD"
        />

        {extraFields}

        <Text style={styles.label}>订单明细</Text>
        {items.map((item, idx) => (
          <View key={idx} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{itemLabel} {idx + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(idx)}>
                  <Text style={styles.removeItem}>删除</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.fieldLabel}>{itemLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {itemOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionChip,
                    item.itemId === option.id && {
                      borderColor: accentColor,
                      backgroundColor: accentColor + "15",
                    },
                  ]}
                  onPress={() => updateItem(idx, "itemId", option.id)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      item.itemId === option.id && {
                        color: accentColor,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.detail && (
                    <Text style={styles.optionChipDetail}>{option.detail}</Text>
                  )}
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

        <TouchableOpacity
          style={[styles.addItemBtn, { borderColor: accentColor }]}
          onPress={addItem}
        >
          <Text style={[styles.addItemBtnText, { color: accentColor }]}>
            + 添加{itemLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: accentColor },
            submitting && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>
              创建{orderType === "purchase" ? "采购" : "销售"}单
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 4,
    marginTop: 8,
  },
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
  optionChipDetail: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
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
  },
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
