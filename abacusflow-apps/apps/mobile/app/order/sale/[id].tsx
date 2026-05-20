import { useEffect, useState } from "react";
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { transactionApi, type SaleOrder } from "@abacusflow/core";
import { translateOrderStatus, dateToFormattedString } from "@abacusflow/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "#fa8c16",
  completed: "#52c41a",
  canceled: "#ff4d4f",
  reversed: "#8c8c8c",
};

export default function SaleOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<SaleOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const res = await transactionApi.getSaleOrder(Number(id));
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: "complete" | "cancel" | "reverse") => {
    const labels = { complete: "完成", cancel: "取消", reverse: "撤回" };
    Alert.alert("确认操作", `确定${labels[action]}该销售单？`, [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        onPress: async () => {
          try {
            if (action === "complete") await transactionApi.completeSaleOrder(Number(id));
            if (action === "cancel") await transactionApi.cancelSaleOrder(Number(id));
            if (action === "reverse") await transactionApi.reverseSaleOrder(Number(id));
            loadOrder();
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1677ff" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>销售单不存在</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[data.status] || "#999";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.orderNo}>{data.orderNo}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {translateOrderStatus(data.status)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>订单日期</Text>
            <Text style={styles.infoValue}>{dateToFormattedString(data.orderDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>客户</Text>
            <Text style={styles.infoValue}>{data.customerName ?? "-"}</Text>
          </View>
          {data.discountFactor != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>折扣</Text>
              <Text style={styles.infoValue}>{data.discountFactor}</Text>
            </View>
          )}
          {data.totalAmount != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>总金额</Text>
              <Text style={[styles.infoValue, styles.amount]}>
                ¥{data.totalAmount.toLocaleString("zh-CN")}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>订单明细</Text>
        <View style={styles.card}>
          {data.items.map((item, idx) => (
            <View key={item.id ?? idx} style={[styles.itemRow, idx < data.items.length - 1 && styles.itemBorder]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName ?? `产品#${item.productId}`}</Text>
                {item.serialNumber && <Text style={styles.itemSerial}>序列号: {item.serialNumber}</Text>}
              </View>
              <View style={styles.itemNumbers}>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
                <Text style={styles.itemPrice}>¥{item.unitPrice.toLocaleString("zh-CN")}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          {data.status === "pending" && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#52c41a" }]}
                onPress={() => handleAction("complete")}
              >
                <Text style={styles.actionBtnText}>完成</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#fff1f0", borderWidth: 1, borderColor: "#ffccc7" }]}
                onPress={() => handleAction("cancel")}
              >
                <Text style={[styles.actionBtnText, { color: "#ff4d4f" }]}>取消</Text>
              </TouchableOpacity>
            </>
          )}
          {data.status === "completed" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#d9d9d9" }]}
              onPress={() => handleAction("reverse")}
            >
              <Text style={[styles.actionBtnText, { color: "#666" }]}>撤回</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 15, color: "#999" },
  content: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  orderNo: { fontSize: 18, fontWeight: "700", color: "#333", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: { fontSize: 14, color: "#999" },
  infoValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  amount: { color: "#1677ff", fontWeight: "700", fontSize: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 8 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0f0" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: "#333", fontWeight: "500" },
  itemSerial: { fontSize: 12, color: "#999", marginTop: 2 },
  itemNumbers: { alignItems: "flex-end" },
  itemQty: { fontSize: 14, color: "#666" },
  itemPrice: { fontSize: 14, color: "#1677ff", fontWeight: "600", marginTop: 2 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
