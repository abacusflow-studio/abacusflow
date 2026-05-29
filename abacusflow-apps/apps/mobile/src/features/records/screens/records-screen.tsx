import { useState, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  transactionApi,
  type BasicPurchaseOrder,
  type BasicSaleOrder,
} from "@abacusflow/core";
import { COLORS, formatCurrency } from "@abacusflow/utils";

type OrderType = "purchase" | "sale";

interface OrderRecord {
  id: string;
  type: OrderType;
  orderNo: string;
  partyName: string;
  status: string;
  totalAmount: number;
  totalQuantity: number;
  itemCount: number;
  orderDate: string;
  createdAt: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  completed: {
    label: "已完成",
    bg: COLORS.successLight,
    color: COLORS.success,
  },
  pending: { label: "待处理", bg: COLORS.warningLight, color: COLORS.warning },
  canceled: { label: "已取消", bg: COLORS.bg, color: COLORS.textTertiary },
  reversed: { label: "已冲销", bg: COLORS.dangerLight, color: COLORS.danger },
};

const TYPE_CONFIG: Record<
  OrderType,
  { label: string; color: string; bg: string }
> = {
  purchase: { label: "入库", color: COLORS.primary, bg: COLORS.primaryLight },
  sale: { label: "出库", color: COLORS.success, bg: COLORS.successLight },
};

const PAGE_SIZE = 20;

export default function RecordsScreen() {
  const [records, setRecords] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const toRecords = (
    purchases: BasicPurchaseOrder[],
    sales: BasicSaleOrder[],
  ): OrderRecord[] => {
    const purchaseRecords: OrderRecord[] = purchases.map((o) => ({
      id: `purchase-${o.id}`,
      type: "purchase" as OrderType,
      orderNo: o.orderNo,
      partyName: o.supplierName,
      status: o.status,
      totalAmount: o.totalAmount,
      totalQuantity: o.totalQuantity,
      itemCount: o.itemCount,
      orderDate: o.orderDate
        ? new Date(o.orderDate).toLocaleDateString("zh-CN")
        : "",
      createdAt:
        typeof o.createdAt === "number"
          ? o.createdAt
          : new Date(o.createdAt).getTime(),
    }));
    const saleRecords: OrderRecord[] = sales.map((o) => ({
      id: `sale-${o.id}`,
      type: "sale" as OrderType,
      orderNo: o.orderNo,
      partyName: o.customerName,
      status: o.status,
      totalAmount: o.totalAmount,
      totalQuantity: o.totalQuantity,
      itemCount: o.itemCount,
      orderDate: o.orderDate
        ? new Date(o.orderDate).toLocaleDateString("zh-CN")
        : "",
      createdAt:
        typeof o.createdAt === "number"
          ? o.createdAt
          : new Date(o.createdAt).getTime(),
    }));
    return [...purchaseRecords, ...saleRecords].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  };

  const fetchRecords = useCallback(async (page: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const [purchaseRes, saleRes] = await Promise.all([
        transactionApi.listBasicPurchaseOrdersPage({
          pageIndex: page,
          pageSize: PAGE_SIZE,
        }),
        transactionApi.listBasicSaleOrdersPage({
          pageIndex: page,
          pageSize: PAGE_SIZE,
        }),
      ]);

      const merged = toRecords(
        purchaseRes.content ?? [],
        saleRes.content ?? [],
      );

      if (append) {
        setRecords((prev) => [...prev, ...merged]);
      } else {
        setRecords(merged);
      }

      const totalP = purchaseRes.totalElements ?? 0;
      const totalS = saleRes.totalElements ?? 0;
      const maxTotal = Math.max(totalP, totalS);
      setHasMore((page + 1) * PAGE_SIZE < maxTotal);
      setPageIndex(page);
    } catch (err) {
      console.error("Failed to load records:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRecords(0, false);
    }, [fetchRecords]),
  );

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchRecords(pageIndex + 1, true);
    }
  };

  const renderItem = ({ item }: { item: OrderRecord }) => {
    const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
    const typeCfg = TYPE_CONFIG[item.type];

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7}>
        <View style={styles.cardTop}>
          <View style={[styles.typeTag, { backgroundColor: typeCfg.bg }]}>
            <Text style={[styles.typeTagText, { color: typeCfg.color }]}>
              {typeCfg.label}
            </Text>
          </View>
          <Text style={styles.orderNo}>{item.orderNo}</Text>
          <View style={[styles.statusTag, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusTagText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.partyLabel}>
              {item.type === "purchase" ? "供应商" : "客户"}
            </Text>
            <Text style={styles.partyName}>{item.partyName || "-"}</Text>
          </View>
          <View style={styles.cardMetrics}>
            <Text style={styles.metric}>
              {item.itemCount} 种 · {item.totalQuantity} 件
            </Text>
            <Text style={styles.amount}>
              {formatCurrency(item.totalAmount)}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>{item.orderDate}</Text>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="document-text-outline"
            size={48}
            color={COLORS.textDisabled}
          />
          <Text style={styles.emptyText}>暂无流水记录</Text>
          <Text style={styles.emptyHint}>
            完成入库或出库后，记录会显示在这里
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={() => fetchRecords(0, false)}
          refreshing={loading}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: { fontSize: 12, fontWeight: "600" },
  orderNo: { fontSize: 14, fontWeight: "600", color: COLORS.text, flex: 1 },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagText: { fontSize: 12, fontWeight: "500" },
  cardBody: { gap: 6 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  partyLabel: { fontSize: 12, color: COLORS.textTertiary },
  partyName: { fontSize: 14, color: COLORS.text },
  cardMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metric: { fontSize: 13, color: COLORS.textSecondary },
  amount: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  dateText: { fontSize: 12, color: COLORS.textTertiary, marginTop: 8 },
  emptyText: { fontSize: 15, color: COLORS.textTertiary, marginTop: 8 },
  emptyHint: { fontSize: 13, color: COLORS.textDisabled },
  footer: { paddingVertical: 16, alignItems: "center" },
});
