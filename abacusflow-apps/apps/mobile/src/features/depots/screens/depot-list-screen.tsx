import { View } from "react-native";
import { useRouter } from "expo-router";
import type { BasicDepot } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Badge } from "@components/ui/badge";
import { THEME } from "@lib/theme";
import { ListScreen } from "@components/layout/list-screen";
import { useDepots } from "../hooks/use-depots";

export default function DepotListScreen() {
  const router = useRouter();
  const {
    data,
    loading,
    loadingMore,
    searchName,
    setSearchName,
    error,
    handleRefresh,
    handleLoadMore,
    hasMore,
  } = useDepots();

  const renderItem = (item: BasicDepot) => (
    <View className="py-1.5">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-base font-semibold flex-1">{item.name}</Text>
        <Badge
          label={item.enabled ? "启用" : "禁用"}
          color={item.enabled ? "#16a34a" : THEME.light.destructive}
          bgColor={item.enabled ? "#dcfce7" : "#fee2e2"}
        />
      </View>
      {item.location && (
        <Text variant="muted" className="text-sm mt-0.5">
          地址: {item.location}
        </Text>
      )}
      {item.capacity != null && (
        <Text variant="muted" className="text-sm mt-0.5">
          容量: {item.capacity}
        </Text>
      )}
    </View>
  );

  return (
    <ListScreen
      data={data}
      loading={loading}
      searchPlaceholder="搜索储存点名称"
      searchValue={searchName}
      onSearchChange={setSearchName}
      onSearch={() => {}}
      onRefresh={handleRefresh}
      onLoadMore={handleLoadMore}
      loadingMore={loadingMore}
      hasMore={hasMore}
      renderItem={renderItem}
      addLabel="新增"
      onAdd={() => router.push("/depot/add" as any)}
      error={error}
      onRetry={handleRefresh}
      keyExtractor={(item) => String(item.id)}
    />
  );
}
