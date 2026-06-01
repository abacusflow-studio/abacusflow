import { FlatList, View } from "react-native";
import type { BasicInventory } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { EmptyState } from "@components/ui/empty-state";

interface Props {
  data: BasicInventory[];
  loading: boolean;
  searched: boolean;
  onRefresh: () => void;
  onPress: (item: BasicInventory) => void;
}

export function InventoryResults({ data, loading, searched, onRefresh, onPress }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerClassName="p-4 gap-3"
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        searched ? <EmptyState icon="file-tray-outline" message="未找到库存" /> : null
      }
      renderItem={({ item }) => (
        <Button variant="ghost" onPress={() => onPress(item)} className="p-0">
          <Card className="w-full">
            <CardContent className="p-4">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-base font-semibold flex-1">{item.productName}</Text>
                <Text variant="muted" className="text-xs">
                  {item.productType === "asset" ? "资产" : "物料"}
                </Text>
              </View>
              <Text variant="muted" className="text-sm">
                库存: {item.quantity}
                {item.depotNames?.length ? ` · ${item.depotNames.join(", ")}` : ""}
              </Text>
            </CardContent>
          </Card>
        </Button>
      )}
    />
  );
}
