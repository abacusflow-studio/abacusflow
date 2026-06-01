import { FlatList, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, formatCurrency } from "@abacusflow/utils";
import type { BasicPurchaseOrder, BasicSaleOrder } from "@abacusflow/core";

interface Props {
  purchaseOrders: BasicPurchaseOrder[];
  saleOrders: BasicSaleOrder[];
  loading: boolean;
  searched: boolean;
  onRefresh: () => void;
}

const ORDER_STATUS_CONFIG: Record<
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

interface MergedOrder {
  _type: "purchase" | "sale";
  id: number;
  orderNo: string;
  status: string;
  partyName: string;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  createdAt: number;
}

/** 订单搜索结果列表 */
export function OrderResults({
  purchaseOrders,
  saleOrders,
  loading,
  searched,
  onRefresh,
}: Props) {
  const merged: MergedOrder[] = [
    ...purchaseOrders.map((o) => ({
      _type: "purchase" as const,
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      partyName: o.supplierName,
      itemCount: o.itemCount,
      totalQuantity: o.totalQuantity,
      totalAmount: o.totalAmount,
      createdAt:
        typeof o.createdAt === "number"
          ? o.createdAt
          : new Date(o.createdAt).getTime(),
    })),
    ...saleOrders.map((o) => ({
      _type: "sale" as const,
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      partyName: o.customerName,
      itemCount: o.itemCount,
      totalQuantity: o.totalQuantity,
      totalAmount: o.totalAmount,
      createdAt:
        typeof o.createdAt === "number"
          ? o.createdAt
          : new Date(o.createdAt).getTime(),
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <FlatList
      data={merged}
      keyExtractor={(item) => `${item._type}-${item.id}`}
      contentContainerStyle={styles.list}
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        searched ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>未找到单据</Text>
            <Text style={styles.emptyHint}>
              输入供应商名、客户名或单号搜索
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const statusCfg =
          ORDER_STATUS_CONFIG[item.status] ?? ORDER_STATUS_CONFIG.pending;
        const isPurchase = item._type === "purchase";
        return (
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.orderTypeTag,
                  {
                    backgroundColor: isPurchase
                      ? COLORS.primaryLight
                      : COLORS.successLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.orderTypeTagText,
                    {
                      color: isPurchase ? COLORS.primary : COLORS.success,
                    },
                  ]}
                >
                  {isPurchase ? "入库" : "出库"}
                </Text>
              </View>
              <Text style={styles.orderNo}>{item.orderNo}</Text>
              <View
                style={[
                  styles.statusTag,
                  { backgroundColor: statusCfg.bg },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: statusCfg.color }]}
                >
                  {statusCfg.label}
                </Text>
              </View>
            </View>
            <View style={styles.orderBody}>
              <Text style={styles.orderParty}>
                {isPurchase ? "供应商" : "客户"}: {item.partyName || "-"}
              </Text>
              <View style={styles.orderMetrics}>
                <Text style={styles.orderMetric}>
                  {item.itemCount} 种 · {item.totalQuantity} 件
                </Text>
                <Text style={styles.orderAmount}>
                  {formatCurrency(item.totalAmount)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  orderTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderTypeTagText: { fontSize: 12, fontWeight: "600" },
  orderNo: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginLeft: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { fontSize: 12, fontWeight: "500" },
  orderBody: { marginTop: 6 },
  orderParty: { fontSize: 13, color: COLORS.textSecondary },
  orderMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  orderMetric: { fontSize: 13, color: COLORS.textSecondary },
  orderAmount: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: COLORS.textTertiary },
  emptyHint: { fontSize: 12, color: COLORS.textDisabled, marginTop: 4 },
});
