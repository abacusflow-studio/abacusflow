import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@components/ui/text";
import { Card, CardContent } from "@components/ui/card";
import { PressableScale } from "@components/ui/pressable-scale";
import { THEME } from "@lib/theme";

interface Props {
  onScanPress: () => void;
  onProductPress: () => void;
  onInventoryPress: () => void;
  onPurchaseOrderPress: () => void;
  onSaleOrderPress: () => void;
  onCustomerPress: () => void;
  onSupplierPress: () => void;
  onDepotPress: () => void;
}

export function LookupMenu({
  onScanPress,
  onProductPress,
  onInventoryPress,
  onPurchaseOrderPress,
  onSaleOrderPress,
  onCustomerPress,
  onSupplierPress,
  onDepotPress,
}: Props) {
  return (
    <View className="flex-1 gap-4 p-4">
      <Text variant="h2" className="mt-2">
        查询
      </Text>
      <Text variant="muted" className="-mt-3">
        查找产品、库存、订单、合作伙伴信息
      </Text>

      {/* 扫码入口 */}
      <PressableScale haptic="medium" onPress={onScanPress}>
        <View className="min-h-[72px] flex-row items-center gap-4 rounded-2xl bg-primary px-5 py-4">
          <Ionicons
            name="scan"
            size={28}
            color={THEME.light.primaryForeground}
          />
          <View className="flex-1">
            <Text className="text-lg font-bold text-primary-foreground">
              扫码查库存
            </Text>
            <Text className="mt-0.5 text-sm text-primary-foreground/80">
              扫描条码查看产品库存
            </Text>
          </View>
        </View>
      </PressableScale>

      {/* 功能网格 - 第一行 */}
      <View className="flex-row gap-3">
        <MenuCard
          icon="cube-outline"
          label="查产品"
          color={THEME.light.primary}
          onPress={onProductPress}
        />
        <MenuCard
          icon="file-tray-outline"
          label="查库存"
          color="#16a34a"
          onPress={onInventoryPress}
        />
        <MenuCard
          icon="document-outline"
          label="采购单"
          color="#d97706"
          onPress={onPurchaseOrderPress}
        />
      </View>

      {/* 功能网格 - 第二行 */}
      <View className="flex-row gap-3">
        <MenuCard
          icon="document-text-outline"
          label="销售单"
          color="#0891b2"
          onPress={onSaleOrderPress}
        />
        <MenuCard
          icon="person-outline"
          label="客户"
          color="#6366f1"
          onPress={onCustomerPress}
        />
        <MenuCard
          icon="storefront-outline"
          label="供应商"
          color="#8b5cf6"
          onPress={onSupplierPress}
        />
      </View>

      {/* 功能网格 - 第三行 */}
      <View className="flex-row gap-3">
        <MenuCard
          icon="location-outline"
          label="存储点"
          color="#ec4899"
          onPress={onDepotPress}
        />
      </View>
    </View>
  );
}

function MenuCard({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <PressableScale className="flex-1" haptic="selection" onPress={onPress}>
      <Card className="min-h-[78px] w-full py-0">
        <CardContent className="items-center gap-2 px-3 py-4">
          <Ionicons name={icon} size={28} color={color} />
          <Text className="text-sm font-semibold">{label}</Text>
        </CardContent>
      </Card>
    </PressableScale>
  );
}
