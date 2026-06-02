import { FlatList, View } from "react-native";
import { formatCurrency } from "@abacusflow/utils";
import type { BasicPurchaseOrder, BasicSaleOrder } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/empty-state";
import { THEME } from "@lib/theme";

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
  completed: { label: "已完成", bg: "#dcfce7", color: "#16a34a" },
  pending: { label: "待处理", bg: "#fef9c3", color: "#ca8a04" },
  canceled: {
    label: "已取消",
    bg: THEME.light.muted,
    color: THEME.light.mutedForeground,
  },
  reversed: { label: "已冲销", bg: "#fee2e2", color: THEME.light.destructive },
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
      contentContainerClassName="p-4 gap-3"
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        searched ? (
          <EmptyState
            icon="receipt-outline"
            message="未找到单据"
            hint="输入供应商名、客户名或单号搜索"
          />
        ) : null
      }
      renderItem={({ item }) => {
        const statusCfg =
          ORDER_STATUS_CONFIG[item.status] ?? ORDER_STATUS_CONFIG.pending;
        const isPurchase = item._type === "purchase";
        return (
          <Card>
            <CardContent className="p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Badge
                  label={isPurchase ? "入库" : "出库"}
                  color={isPurchase ? THEME.light.primary : "#16a34a"}
                  bgColor={isPurchase ? "#dcfce7" : "#dcfce7"}
                />
                <Text className="text-sm font-semibold flex-1">
                  {item.orderNo}
                </Text>
                <Badge
                  label={statusCfg.label}
                  color={statusCfg.color}
                  bgColor={statusCfg.bg}
                />
              </View>
              <Text variant="muted" className="text-sm">
                {isPurchase ? "供应商" : "客户"}: {item.partyName || "-"}
              </Text>
              <View className="flex-row justify-between items-center mt-1">
                <Text variant="muted" className="text-sm">
                  {item.itemCount} 种 · {item.totalQuantity} 件
                </Text>
                <Text className="text-base font-bold">
                  {formatCurrency(item.totalAmount)}
                </Text>
              </View>
            </CardContent>
          </Card>
        );
      }}
    />
  );
}
