import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { transactionApi, type PurchaseOrder, type SaleOrder } from "@abacusflow/core";
import { translateOrderStatus, dateToFormattedString } from "@abacusflow/utils";

type OrderItem = (PurchaseOrder | SaleOrder) & { _type: "purchase" | "sale" };

const STATUS_COLORS: Record<string, string> = {
  pending: "#fa8c16",
  completed: "#52c41a",
  canceled: "#ff4d4f",
  reversed: "#8c8c8c",
};

export default function OrdersScreen() {
  const router = useRouter();
  const [data, setData] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purchaseRes, saleRes] = await Promise.all([
        transactionApi.listPurchaseOrdersPage({ pageIndex: 1, pageSize: 25 }),
        transactionApi.listSaleOrdersPage({ pageIndex: 1, pageSize: 25 }),
      ]);
      const items: OrderItem[] = [
        ...purchaseRes.content.map((o) => ({ ...o, _type: "purchase" as const })),
        ...saleRes.content.map((o) => ({ ...o, _type: "sale" as const })),
      ].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      setData(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: OrderItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push((item._type === "purchase" ? `/order/purchase/${item.id}` : `/order/sale/${item.id}`) as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.orderNo}</Text>
        <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] || "#999") + "20" }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] || "#999" }]}>
            {translateOrderStatus(item.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.cardDetail}>
        {item._type === "purchase" ? "采购" : "销售"} · {dateToFormattedString(item.orderDate)}
      </Text>
      <Text style={styles.cardDetail}>
        {item._type === "purchase"
          ? `供应商: ${(item as PurchaseOrder).supplierName ?? "-"}`
          : `客户: ${(item as SaleOrder).customerName ?? "-"}`}
      </Text>
      {item.totalAmount != null && (
        <Text style={styles.cardAmount}>¥{item.totalAmount.toLocaleString("zh-CN")}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1677ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/order/purchase/add" as any)}>
          <Text style={styles.actionBtnText}>+ 采购单</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.saleBtn]} onPress={() => router.push("/order/sale/add" as any)}>
          <Text style={styles.actionBtnText}>+ 销售单</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => `${item._type}-${item.id}`}
        contentContainerStyle={styles.list}
        onRefresh={loadData}
        refreshing={loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  actionBar: { flexDirection: "row", padding: 16, gap: 12, backgroundColor: "#fff" },
  actionBtn: {
    flex: 1,
    backgroundColor: "#1677ff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  saleBtn: { backgroundColor: "#722ed1" },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "500" },
  cardDetail: { fontSize: 13, color: "#666", marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: "700", color: "#1677ff", marginTop: 8 },
});
