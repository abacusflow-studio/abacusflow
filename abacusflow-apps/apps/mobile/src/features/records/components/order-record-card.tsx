import { View } from "react-native";
import { Card, CardContent } from "@components/ui/card";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { Badge } from "@components/ui/badge";
import { formatCurrency } from "@abacusflow/utils";
import { THEME } from "@lib/theme";
import type { OrderRecord } from "../types";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  completed: { label: "已完成", bg: "#dcfce7", color: "#16a34a" },
  pending: { label: "待处理", bg: "#fef9c3", color: "#ca8a04" },
  canceled: { label: "已取消", bg: THEME.light.muted, color: THEME.light.mutedForeground },
  reversed: { label: "已冲销", bg: "#fee2e2", color: THEME.light.destructive },
};

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  purchase: { label: "入库", bg: THEME.light.primary + "20", color: THEME.light.primary },
  sale: { label: "出库", bg: "#dcfce7", color: "#16a34a" },
};

interface Props {
  item: OrderRecord;
  onPress?: () => void;
}

export function OrderRecordCard({ item, onPress }: Props) {
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const typeCfg = TYPE_CONFIG[item.type];

  return (
    <Button variant="ghost" onPress={onPress} className="p-0" disabled={!onPress}>
      <Card className="w-full py-0">
        <CardContent className="gap-3 px-4 py-4">
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground">
                {item.type === "purchase" ? "供应商" : "客户"}
              </Text>
              <Text className="mt-1 text-base font-bold" numberOfLines={1}>
                {item.partyName || "-"}
              </Text>
            </View>
            <Badge label={statusCfg.label} color={statusCfg.color} bgColor={statusCfg.bg} />
          </View>

          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Badge label={typeCfg.label} color={typeCfg.color} bgColor={typeCfg.bg} />
              <Text className="flex-1 text-sm font-medium text-muted-foreground">
                {item.orderNo}
              </Text>
            </View>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-sm text-muted-foreground">
                {item.itemCount} 种 / {item.totalQuantity} 件
              </Text>
              <Text className="text-base font-bold">
                {formatCurrency(item.totalAmount)}
              </Text>
            </View>
          </View>

          <Text className="text-xs text-muted-foreground">{item.orderDate}</Text>
        </CardContent>
      </Card>
    </Button>
  );
}
