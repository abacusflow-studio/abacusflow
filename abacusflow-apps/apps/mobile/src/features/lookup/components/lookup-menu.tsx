import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@components/ui/button";
import { Card } from "@components/ui/card";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";

interface Props {
  onScanPress: () => void;
  onProductPress: () => void;
  onInventoryPress: () => void;
  onOrderPress: () => void;
}

/** 查询模式选择菜单 */
export function LookupMenu({
  onScanPress,
  onProductPress,
  onInventoryPress,
  onOrderPress,
}: Props) {
  return (
    <View className="flex-1 gap-5 p-4">
      <View>
        <Text variant="h3" className="text-left text-2xl">
          查询
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          查找产品、库存、订单信息
        </Text>
      </View>

      <Button
        className="h-auto justify-start gap-4 rounded-2xl px-5 py-5"
        onPress={onScanPress}
      >
        <Ionicons
          name="scan"
          size={28}
          color={THEME.light.primaryForeground}
        />
        <View className="flex-1">
          <Text className="text-lg font-bold text-primary-foreground">
            扫码查库存
          </Text>
          <Text className="mt-1 text-sm text-primary-foreground/80">
            扫描条码查看产品库存
          </Text>
        </View>
      </Button>

      <View className="flex-row gap-3">
        <LookupCard
          title="查产品"
          icon="cube-outline"
          iconColor={THEME.light.primary}
          onPress={onProductPress}
        />
        <LookupCard
          title="查库存"
          icon="file-tray-outline"
          iconColor={THEME.light.accent}
          onPress={onInventoryPress}
        />
        <LookupCard
          title="查单据"
          icon="receipt-outline"
          iconColor="#b45309"
          onPress={onOrderPress}
        />
      </View>
    </View>
  );
}

interface LookupCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
}

function LookupCard({ title, icon, iconColor, onPress }: LookupCardProps) {
  return (
    <Card className="flex-1 py-0">
      <Button
        variant="ghost"
        className="h-auto flex-col gap-2 rounded-xl px-3 py-5"
        onPress={onPress}
      >
        <Ionicons name={icon} size={28} color={iconColor} />
        <Text className="text-sm font-semibold">{title}</Text>
      </Button>
    </Card>
  );
}
