import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
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
    <View className="flex-1 p-4">
      <Text variant="h2" className="mt-2">查询</Text>
      <Text variant="muted" className="mt-1 mb-6">查找产品、库存、订单、合作伙伴信息</Text>

      {/* 扫码入口 */}
      <Button size="lg" onPress={onScanPress} className="flex-row items-center gap-4 rounded-2xl p-5 mb-5">
        <Ionicons name="scan" size={28} color={THEME.light.primaryForeground} />
        <View className="flex-1">
          <Text className="text-lg font-bold text-primary-foreground">扫码查库存</Text>
          <Text className="text-sm text-primary-foreground/80 mt-0.5">扫描条码查看产品库存</Text>
        </View>
      </Button>

      {/* 功能网格 - 第一行 */}
      <View className="flex-row gap-3 mb-3">
        <MenuCard icon="cube-outline" label="查产品" color={THEME.light.primary} onPress={onProductPress} />
        <MenuCard icon="file-tray-outline" label="查库存" color="#16a34a" onPress={onInventoryPress} />
        <MenuCard icon="document-outline" label="采购单" color="#d97706" onPress={onPurchaseOrderPress} />
      </View>

      {/* 功能网格 - 第二行 */}
      <View className="flex-row gap-3 mb-3">
        <MenuCard icon="document-text-outline" label="销售单" color="#0891b2" onPress={onSaleOrderPress} />
        <MenuCard icon="person-outline" label="客户" color="#6366f1" onPress={onCustomerPress} />
        <MenuCard icon="storefront-outline" label="供应商" color="#8b5cf6" onPress={onSupplierPress} />
      </View>

      {/* 功能网格 - 第三行 */}
      <View className="flex-row gap-3">
        <MenuCard icon="location-outline" label="储存点" color="#ec4899" onPress={onDepotPress} />
      </View>
    </View>
  );
}

function MenuCard({ icon, label, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Button variant="ghost" onPress={onPress} className="flex-1 p-0">
      <Card className="w-full py-4">
        <CardContent className="items-center gap-2 px-4">
          <Ionicons name={icon} size={28} color={color} />
          <Text className="text-sm font-semibold">{label}</Text>
        </CardContent>
      </Card>
    </Button>
  );
}
