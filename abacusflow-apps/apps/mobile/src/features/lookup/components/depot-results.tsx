import { FlatList, View } from "react-native";
import type { BasicDepot } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/empty-state";
import { THEME } from "@lib/theme";

interface Props {
  data: BasicDepot[];
  loading: boolean;
  searched: boolean;
  onRefresh: () => void;
  onPress: (item: BasicDepot) => void;
}

export function DepotResults({ data, loading, searched, onRefresh, onPress }: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerClassName="p-4 gap-3"
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        searched ? <EmptyState icon="location-outline" message="未找到储存点" /> : null
      }
      renderItem={({ item }) => (
        <Button variant="ghost" onPress={() => onPress(item)} className="p-0">
          <Card className="w-full">
            <CardContent className="p-4">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-base font-semibold flex-1">{item.name}</Text>
                <Badge
                  label={item.enabled ? "启用" : "禁用"}
                  color={item.enabled ? THEME.light.primary : THEME.light.destructive}
                  bgColor={item.enabled ? "#f6ffed" : "#fff1f0"}
                />
              </View>
              {item.location && (
                <Text variant="muted" className="text-sm">地址: {item.location}</Text>
              )}
              {item.capacity != null && (
                <Text variant="muted" className="text-sm">容量: {item.capacity}</Text>
              )}
            </CardContent>
          </Card>
        </Button>
      )}
    />
  );
}
