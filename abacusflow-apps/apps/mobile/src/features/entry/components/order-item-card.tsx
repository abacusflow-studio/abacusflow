import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedCard } from "@components/ui/animated-card";
import { Button } from "@components/ui/button";
import { CardContent } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";

interface OrderItemCardProps {
  title: string;
  subtitle?: string;
  quantity: string;
  unitPrice: string;
  isAsset?: boolean;
  serialNumber?: string;
  onQuantityChange: (value: string) => void;
  onUnitPriceChange: (value: string) => void;
  onSerialNumberChange?: (value: string) => void;
  onDelete: () => void;
}

/** 单个订单行项目卡片 */
export function OrderItemCard({
  title,
  subtitle,
  quantity,
  unitPrice,
  isAsset,
  serialNumber,
  onQuantityChange,
  onUnitPriceChange,
  onSerialNumberChange,
  onDelete,
}: OrderItemCardProps) {
  return (
    <AnimatedCard>
      <CardContent className="gap-4 px-4 py-4">
        <View className="flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Ionicons
              name="cube-outline"
              size={20}
              color={THEME.light.primary}
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold" numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text className="mt-1 text-xs text-muted-foreground">
                {subtitle}
              </Text>
            )}
          </View>
          {isAsset && (
            <View className="rounded-md bg-primary/10 px-2 py-1">
              <Text className="text-xs font-semibold text-primary">资产</Text>
            </View>
          )}
          <Button variant="ghost" size="icon" onPress={onDelete}>
            <Ionicons
              name="trash-outline"
              size={18}
              color={THEME.light.destructive}
            />
          </Button>
        </View>

        {isAsset && onSerialNumberChange && (
          <View className="gap-2">
            <Text className="text-xs font-medium text-muted-foreground">
              序列号 <Text className="text-destructive">*</Text>
            </Text>
            <Input
              className="h-11 bg-background"
              value={serialNumber}
              onChangeText={onSerialNumberChange}
              placeholder="资产序列号（必填）"
              autoCapitalize="characters"
            />
          </View>
        )}

        <View className="flex-row gap-3">
          <View className="flex-1 gap-2">
            <Text className="text-xs font-medium text-muted-foreground">
              数量
            </Text>
            <Input
              className="h-11 bg-background"
              value={quantity}
              onChangeText={onQuantityChange}
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1 gap-2">
            <Text className="text-xs font-medium text-muted-foreground">
              单价
            </Text>
            <Input
              className="h-11 bg-background"
              value={unitPrice}
              onChangeText={onUnitPriceChange}
              keyboardType="numeric"
              placeholder="0.00"
            />
          </View>
        </View>
      </CardContent>
    </AnimatedCard>
  );
}
