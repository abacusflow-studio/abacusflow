import { FlatList, View } from "react-native";
import { formatCurrency } from "@abacusflow/utils";
import type { BasicSaleOrder } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/empty-state";
import { THEME } from "@lib/theme";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  completed: { label: "已完成", bg: "#dcfce7", color: "#16a34a" },
  pending: { label: "待处理", bg: "#fef9c3", color: "#ca8a04" },
  canceled: { label: "已取消", bg: THEME.light.muted, color: THEME.light.mutedForeground },
  reversed: { label: "已冲销", bg: "#fee2e2", color: THEME.light.destructive },
};

interface Props {
  data: BasicSaleOrder[];
  loading: boolean;
  searched: boolean;
  onRefresh: () => void;
}

export function SaleOrderResults({ data, loading, searched, onRefresh }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerClassName="p-4 gap-3"
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        searched ? (
          <EmptyState icon="document-text-outline" message="未找到销售单" hint="输入客户名、单号或库存单元名搜索" />
        ) : null
      }
      renderItem={({ item }) => {
        const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
        return (
          <Card>
            <CardContent className="p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Badge label="出库" color="#0891b2" bgColor="#ecfeff" />
                <Text className="text-sm font-semibold flex-1">{item.orderNo}</Text>
                <Badge label={statusCfg.label} color={statusCfg.color} bgColor={statusCfg.bg} />
              </View>
              <Text variant="muted" className="text-sm">客户: {item.customerName || "-"}</Text>
              <View className="flex-row justify-between items-center mt-1">
                <Text variant="muted" className="text-sm">{item.itemCount} 种 · {item.totalQuantity} 件</Text>
                <Text className="text-base font-bold">{formatCurrency(item.totalAmount)}</Text>
              </View>
            </CardContent>
          </Card>
        );
      }}
    />
  );
}
