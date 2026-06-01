import { ActivityIndicator, FlatList, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@components/ui/button";
import { EmptyState } from "@components/ui/empty-state";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";
import { cn } from "@lib/utils";
import { useOrderRecords, type OrderFilter } from "../hooks/use-merged-orders";
import { OrderRecordCard } from "../components/order-record-card";

const FILTER_TABS: { key: OrderFilter; label: string; icon: string }[] = [
  { key: "sale", label: "出库", icon: "arrow-up-outline" },
  { key: "purchase", label: "入库", icon: "download-outline" },
];

export default function RecordsScreen() {
  const {
    records,
    loading,
    loadingMore,
    filter,
    setFilter,
    handleLoadMore,
    handleRefresh,
  } = useOrderRecords();

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" color={THEME.light.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        message={filter === "purchase" ? "暂无入库记录" : "暂无出库记录"}
        hint={`完成${filter === "purchase" ? "入库" : "出库"}后，记录会显示在这里`}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-3">
        <View className="flex-row gap-1 rounded-xl bg-muted p-1">
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <Button
                key={tab.key}
                variant={isActive ? "outline" : "ghost"}
                className={cn("h-10 flex-1 gap-2", isActive && "bg-card")}
                onPress={() => setFilter(tab.key)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={
                    isActive ? THEME.light.primary : THEME.light.mutedForeground
                  }
                />
                <Text
                  className={cn(
                    "text-sm",
                    isActive ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {tab.label}
                </Text>
              </Button>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color={THEME.light.primary} />
          <Text className="text-sm text-muted-foreground">加载中...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={({ item }) => <OrderRecordCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 p-4"
          onRefresh={handleRefresh}
          refreshing={loading}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
}
