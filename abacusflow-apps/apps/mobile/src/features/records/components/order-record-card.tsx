import { Pressable, View } from "react-native";

import { Card, CardContent } from "@components/ui/card";
import { Text } from "@components/ui/text";
import { formatCurrency } from "@abacusflow/utils";
import { cn } from "@lib/utils";
import type { OrderRecord } from "../types";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; textClassName: string }
> = {
  completed: {
    label: "已完成",
    className: "bg-emerald-50",
    textClassName: "text-emerald-700",
  },
  pending: {
    label: "待处理",
    className: "bg-amber-50",
    textClassName: "text-amber-700",
  },
  canceled: {
    label: "已取消",
    className: "bg-muted",
    textClassName: "text-muted-foreground",
  },
  reversed: {
    label: "已冲销",
    className: "bg-red-50",
    textClassName: "text-red-700",
  },
};

const TYPE_CONFIG: Record<
  string,
  { label: string; className: string; textClassName: string }
> = {
  purchase: {
    label: "入库",
    className: "bg-primary/10",
    textClassName: "text-primary",
  },
  sale: {
    label: "出库",
    className: "bg-accent/10",
    textClassName: "text-accent",
  },
};

interface Props {
  item: OrderRecord;
  onPress?: () => void;
}

/** 订单记录卡片 */
export function OrderRecordCard({ item, onPress }: Props) {
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const typeCfg = TYPE_CONFIG[item.type];

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card className="py-0">
        <CardContent className="gap-3 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <Badge
              label={typeCfg.label}
              className={typeCfg.className}
              textClassName={typeCfg.textClassName}
            />
            <Text className="flex-1 text-sm font-semibold">{item.orderNo}</Text>
            <Badge
              label={statusCfg.label}
              className={statusCfg.className}
              textClassName={statusCfg.textClassName}
            />
          </View>

          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-muted-foreground">
                {item.type === "purchase" ? "供应商" : "客户"}
              </Text>
              <Text className="text-sm">{item.partyName || "-"}</Text>
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
    </Pressable>
  );
}

interface BadgeProps {
  label: string;
  className: string;
  textClassName: string;
}

function Badge({ label, className, textClassName }: BadgeProps) {
  return (
    <View className={cn("rounded px-2 py-1", className)}>
      <Text className={cn("text-xs font-semibold", textClassName)}>
        {label}
      </Text>
    </View>
  );
}
