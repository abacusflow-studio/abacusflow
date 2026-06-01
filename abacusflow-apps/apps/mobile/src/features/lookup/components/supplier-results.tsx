import { FlatList, View } from "react-native";
import type { BasicSupplier } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/empty-state";
import { THEME } from "@lib/theme";

interface Props {
  data: BasicSupplier[];
  loading: boolean;
  searched: boolean;
  onRefresh: () => void;
  onPress: (item: BasicSupplier) => void;
}

export function SupplierResults({ data, loading, searched, onRefresh, onPress }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerClassName="p-4 gap-3"
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        searched ? <EmptyState icon="storefront-outline" message="未找到供应商" /> : null
      }
      renderItem={({ item }) => (
        <Button variant="ghost" onPress={() => onPress(item)} className="p-0">
          <Card className="w-full">
            <CardContent className="p-4">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-base font-semibold flex-1">{item.name}</Text>
                {item.totalOrderCount > 0 && (
                  <Badge
                    label={`${item.totalOrderCount} 单`}
                    color={THEME.light.primary}
                    bgColor={THEME.light.primary + "20"}
                  />
                )}
              </View>
              {item.contactPerson && (
                <Text variant="muted" className="text-sm">联系人: {item.contactPerson}</Text>
              )}
              {item.phone && (
                <Text variant="muted" className="text-sm">电话: {item.phone}</Text>
              )}
              {item.address && (
                <Text variant="muted" className="text-sm">地址: {item.address}</Text>
              )}
            </CardContent>
          </Card>
        </Button>
      )}
    />
  );
}
