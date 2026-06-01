import { FlatList, View } from "react-native";
import { translateProductType, translateProductUnit } from "@abacusflow/utils";
import type { BasicProduct } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Card, CardContent } from "@components/ui/card";
import { PressableScale } from "@components/ui/pressable-scale";
import { EmptyState } from "@components/ui/empty-state";

interface Props {
  data: BasicProduct[];
  loading: boolean;
  searched: boolean;
  onRefresh: () => void;
  onPress: (item: BasicProduct) => void;
}

export function ProductResults({ data, loading, searched, onRefresh, onPress }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerClassName="p-4 gap-3"
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        searched ? <EmptyState icon="cube-outline" message="未找到产品" /> : null
      }
      renderItem={({ item }) => (
        <PressableScale haptic="selection" onPress={() => onPress(item)} scaleTo={0.99}>
          <Card className="w-full py-0">
            <CardContent className="p-4">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-base font-semibold flex-1">{item.name}</Text>
                <Text variant="muted" className="text-xs">{item.barcode}</Text>
              </View>
              <Text variant="muted" className="text-sm">
                {translateProductType(item.type)} · {translateProductUnit(item.unit)}
                {item.categoryName ? ` · ${item.categoryName}` : ""}
              </Text>
            </CardContent>
          </Card>
        </PressableScale>
      )}
    />
  );
}
