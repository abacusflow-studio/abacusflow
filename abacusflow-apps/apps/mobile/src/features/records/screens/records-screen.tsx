import { ActivityIndicator, FlatList, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedCard } from "@components/ui/animated-card";
import { CardContent } from "@components/ui/card";
import { EmptyState } from "@components/ui/empty-state";
import { Input } from "@components/ui/input";
import { PressableScale } from "@components/ui/pressable-scale";
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
  const router = useRouter();
  const {
    records,
    loading,
    loadingMore,
    filter,
    searchValue,
    searchKeyword,
    setSearchValue,
    setFilter,
    handleSearch,
    handleClearSearch,
    handleLoadMore,
    handleRefresh,
  } = useOrderRecords();

  const totalQuantity = records.reduce(
    (sum, item) => sum + item.totalQuantity,
    0,
  );
  const totalAmount = records.reduce((sum, item) => sum + item.totalAmount, 0);
  const completedCount = records.filter((item) => item.status === "completed").length;
  const filterLabel = filter === "purchase" ? "入库流水" : "出库流水";

  const openDetail = (item: (typeof records)[number]) => {
    const id = item.id.replace(`${item.type}-`, "");
    router.push(`/record/${item.type}/${id}` as any);
  };

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
        message={
          searchKeyword
            ? "没有匹配的交易记录"
            : filter === "purchase"
              ? "暂无入库记录"
              : "暂无出库记录"
        }
        hint={
          searchKeyword
            ? "试试客户/供应商名称或完整流水号"
            : `完成${filter === "purchase" ? "入库" : "出库"}后，记录会显示在这里`
        }
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="gap-4 border-b border-border bg-card px-4 pb-4 pt-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase text-primary">
              业务流水
            </Text>
            <Text className="mt-1 text-2xl font-bold">{filterLabel}</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Ionicons
              name="swap-horizontal-outline"
              size={22}
              color={THEME.light.primary}
            />
          </View>
        </View>

        <View className="flex-row gap-2 rounded-2xl bg-muted p-1">
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <PressableScale
                key={tab.key}
                className="flex-1"
                haptic="selection"
                onPress={() => setFilter(tab.key)}
              >
                <View
                  className={cn(
                    "h-11 flex-row items-center justify-center gap-2 rounded-xl",
                    isActive && "border border-border bg-card",
                  )}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={
                      isActive
                        ? THEME.light.primary
                        : THEME.light.mutedForeground
                    }
                  />
                  <Text
                    className={cn(
                      "text-sm",
                      isActive
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {tab.label}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>

        <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-background px-3">
          <Ionicons
            name="search-outline"
            size={18}
            color={THEME.light.mutedForeground}
          />
          <Input
            className="h-11 flex-1 border-0 bg-transparent px-0"
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder={
              filter === "purchase"
                ? "搜索供应商 / 入库流水号"
                : "搜索客户 / 出库流水号"
            }
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchValue ? (
            <PressableScale haptic="selection" onPress={handleClearSearch}>
              <View className="h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Ionicons
                  name="close-outline"
                  size={18}
                  color={THEME.light.mutedForeground}
                />
              </View>
            </PressableScale>
          ) : null}
          <PressableScale haptic="selection" onPress={handleSearch}>
            <View className="h-8 items-center justify-center rounded-full bg-primary px-3">
              <Text className="text-xs font-semibold text-primary-foreground">
                搜索
              </Text>
            </View>
          </PressableScale>
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
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 220, delay: index * 35 }}
            >
              <OrderRecordCard item={item} onPress={() => openDetail(item)} />
            </MotiView>
          )}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 p-4"
          onRefresh={handleRefresh}
          refreshing={loading}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <AnimatedCard delay={30}>
              <CardContent className="gap-4 px-4 py-4">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm text-muted-foreground">
                      当前筛选
                    </Text>
                    <Text className="mt-1 text-xl font-bold">{filterLabel}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-primary">
                    {searchKeyword ? `匹配 ${records.length} 单` : `${records.length} 单`}
                  </Text>
                </View>
                <View className="flex-row gap-3">
                  <RecordMetric label="已完成" value={String(completedCount)} />
                  <RecordMetric label="总件数" value={String(totalQuantity)} />
                  <RecordMetric
                    label="金额"
                    value={`¥${Math.round(totalAmount).toLocaleString("zh-CN")}`}
                  />
                </View>
              </CardContent>
            </AnimatedCard>
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
}

function RecordMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl bg-muted px-3 py-3">
      <Text className="text-base font-bold">{value}</Text>
      <Text className="mt-1 text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}
