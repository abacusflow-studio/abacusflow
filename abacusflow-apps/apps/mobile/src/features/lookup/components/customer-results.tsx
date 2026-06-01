import { FlatList, View } from "react-native";
import type { BasicCustomer } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Card, CardContent } from "@components/ui/card";
import { PressableScale } from "@components/ui/pressable-scale";
import { Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/empty-state";
import { THEME } from "@lib/theme";

interface Props {
  data: BasicCustomer[];
  loading: boolean;
  searched: boolean;
  onRefresh: () => void;
  onPress: (item: BasicCustomer) => void;
}

export function CustomerResults({ data, loading, searched, onRefresh, onPress }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerClassName="p-4 gap-3"
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        searched ? <EmptyState icon="person-outline" message="未找到客户" /> : null
      }
      renderItem={({ item }) => (
        <PressableScale haptic="selection" onPress={() => onPress(item)} scaleTo={0.99}>
          <Card className="w-full py-0">
            <CardContent className="p-4">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-base font-semibold flex-1">{item.name}</Text>
                {item.totalOrderCount > 0 && (
                  <Badge
                    label={`${item.totalOrderCount} 单`}
                    color={THEME.light.primary}
                    bgColor={"#dcfce7"}
                  />
                )}
              </View>
              {item.phone && (
                <Text variant="muted" className="text-sm">电话: {item.phone}</Text>
              )}
              {item.address && (
                <Text variant="muted" className="text-sm">地址: {item.address}</Text>
              )}
              {item.totalOrderAmount > 0 && (
                <Text className="text-sm font-semibold mt-2" style={{ color: THEME.light.primary }}>
                  累计: ¥{item.totalOrderAmount.toLocaleString("zh-CN")}
                </Text>
              )}
            </CardContent>
          </Card>
        </PressableScale>
      )}
    />
  );
}
