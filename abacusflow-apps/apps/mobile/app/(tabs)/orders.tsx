import { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  transactionApi,
  type PurchaseOrder,
  type SaleOrder,
} from "@abacusflow/core";
import {
  translateOrderStatus,
  dateToFormattedString,
  STATUS_COLORS,
  COLORS,
} from "@abacusflow/utils";

type OrderItem = (PurchaseOrder | SaleOrder) & { _type: "purchase" | "sale" };

export default function OrdersScreen() {
  const router = useRouter();
  const [data, setData] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOrderNo, setSearchOrderNo] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        pageIndex: 1,
        pageSize: 25,
        orderNo: searchOrderNo || undefined,
      };
      const [purchaseRes, saleRes] = await Promise.all([
        transactionApi.listPurchaseOrdersPage(params),
        transactionApi.listSaleOrdersPage(params),
      ]);
      const items: OrderItem[] = [
        ...purchaseRes.content.map((o) => ({
          ...o,
          _type: "purchase" as const,
        })),
        ...saleRes.content.map((o) => ({ ...o, _type: "sale" as const })),
      ].sort(
        (a, b) =>
          new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
      );
      setData(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchOrderNo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderItem = ({ item }: { item: OrderItem }) => {
    const statusColor = STATUS_COLORS[item.status]?.color || "#999";
    const statusBg = STATUS_COLORS[item.status]?.bg || "#f0f0f0";
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push(
            (item._type === "purchase"
              ? `/order/purchase/${item.id}`
              : `/order/sale/${item.id}`) as any,
          )
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.orderNo}</Text>
          <View style={[styles.badge, { backgroundColor: statusBg }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {translateOrderStatus(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDetail}>
          {item._type === "purchase" ? "采购" : "销售"} ·{" "}
          {dateToFormattedString(item.orderDate)}
        </Text>
        <Text style={styles.cardDetail}>
          {item._type === "purchase"
            ? `供应商: ${(item as PurchaseOrder).supplierName ?? "-"}`
            : `客户: ${(item as SaleOrder).customerName ?? "-"}`}
        </Text>
        {item.totalAmount != null && (
          <Text style={styles.cardAmount}>
            ¥{item.totalAmount.toLocaleString("zh-CN")}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={searchOrderNo}
          onChangeText={setSearchOrderNo}
          placeholder="搜索订单编号"
          onSubmitEditing={loadData}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push("/order/purchase/add" as any)}
        >
          <Text style={styles.actionBtnText}>+ 采购单</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.saleBtn]}
          onPress={() => router.push("/order/sale/add" as any)}
        >
          <Text style={styles.actionBtnText}>+ 销售单</Text>
        </TouchableOpacity>
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => `${item._type}-${item.id}`}
          contentContainerStyle={styles.list}
          onRefresh={loadData}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无订单</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
    backgroundColor: "#fff",
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
  },
  saleBtn: { backgroundColor: "#722ed1" },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "500" },
  cardDetail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  cardAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 8,
  },
  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: COLORS.textTertiary },
});
