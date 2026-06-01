import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { THEME } from "@lib/theme";
import type { SelectableProduct } from "@abacusflow/core";

interface Props {
  barcode: string;
  product: SelectableProduct | null;
  onPurchase: () => void;
  onSale: () => void;
  onCreateProduct: () => void;
}

export function ScanResultCard({ barcode, product, onPurchase, onSale, onCreateProduct }: Props) {
  return (
    <View className="flex-1 p-4 gap-4">
      {/* 条码 */}
      <Card className="bg-primary/10">
        <CardContent className="flex-row items-center gap-3 p-4">
          <Ionicons name="barcode-outline" size={22} color={THEME.light.primary} />
          <Text className="text-lg font-semibold flex-1" style={{ color: THEME.light.primary }}>
            {barcode}
          </Text>
        </CardContent>
      </Card>

      {product ? (
        <Card>
          <CardContent className="p-5 gap-3">
            <View className="flex-row items-center gap-3 pb-4 border-b border-border">
              <Ionicons name="cube" size={28} color="#16a34a" />
              <View className="flex-1">
                <Text className="text-lg font-bold">{product.name}</Text>
                <Text variant="muted" className="text-sm mt-0.5">
                  {product.type === "asset" ? "资产" : "物料"} · {product.barcode}
                </Text>
              </View>
              <Badge label="已存在" color="#16a34a" bgColor="#dcfce7" />
            </View>

            <Button variant="outline" onPress={onPurchase} className="justify-start">
              <View className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center">
                <Ionicons name="download-outline" size={22} color={THEME.light.primary} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-semibold">入库</Text>
                <Text variant="muted" className="text-xs">创建采购入库单</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.light.mutedForeground} />
            </Button>

            <Button variant="outline" onPress={onSale} className="justify-start">
              <View className="w-11 h-11 rounded-xl bg-emerald-500/10 items-center justify-center">
                <Ionicons name="arrow-up-outline" size={22} color="#16a34a" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-semibold">出库</Text>
                <Text variant="muted" className="text-xs">
                  创建销售出库单{product.type === "asset" ? "，需确认SN" : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.light.mutedForeground} />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 gap-4">
            <View className="items-center py-3 gap-1.5">
              <Ionicons name="alert-circle-outline" size={48} color={THEME.light.destructive} />
              <Text className="text-lg font-bold">产品未录入</Text>
              <Text variant="muted">该条码尚未注册</Text>
            </View>
            <Button onPress={onCreateProduct}>
              <Ionicons name="add-circle-outline" size={20} color={THEME.light.primaryForeground} />
              <Text className="text-base font-semibold text-primary-foreground">建档并入库</Text>
            </Button>
          </CardContent>
        </Card>
      )}
    </View>
  );
}
