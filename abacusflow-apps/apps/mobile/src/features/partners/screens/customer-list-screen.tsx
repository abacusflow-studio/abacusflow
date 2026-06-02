import { View } from "react-native";
import { useRouter } from "expo-router";
import type { BasicCustomer } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Badge } from "@components/ui/badge";
import { THEME } from "@lib/theme";
import { ListScreen } from "@components/layout/list-screen";
import { useCustomers } from "../hooks/use-partners";

export default function CustomerListScreen() {
  const router = useRouter();
  const {
    data,
    loading,
    loadingMore,
    searchName,
    setSearchName,
    handleSearch,
    handleRefresh,
    handleLoadMore,
    hasMore,
  } = useCustomers();

  const renderItem = (item: BasicCustomer) => (
    <View className="py-1.5">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-base font-semibold flex-1">{item.name}</Text>
        {item.totalOrderCount != null && item.totalOrderCount > 0 && (
          <Badge
            label={`${item.totalOrderCount} 单`}
            color={THEME.light.primary}
            bgColor={"#dcfce7"}
          />
        )}
      </View>
      {item.phone && <Text variant="muted" className="text-sm mt-0.5">电话: {item.phone}</Text>}
      {item.address && <Text variant="muted" className="text-sm mt-0.5">地址: {item.address}</Text>}
      {item.totalOrderAmount != null && item.totalOrderAmount > 0 && (
        <Text className="text-sm font-semibold mt-2" style={{ color: THEME.light.primary }}>
          累计: ¥{item.totalOrderAmount.toLocaleString("zh-CN")}
        </Text>
      )}
    </View>
  );

  return (
    <ListScreen
      data={data}
      loading={loading}
      searchPlaceholder="搜索客户名称"
      searchValue={searchName}
      onSearchChange={setSearchName}
      onSearch={handleSearch}
      onRefresh={handleRefresh}
      onLoadMore={handleLoadMore}
      loadingMore={loadingMore}
      hasMore={hasMore}
      renderItem={renderItem}
      addLabel="新增"
      onAdd={() => router.push("/partner/customer/add" as any)}
      keyExtractor={(item) => String(item.id)}
    />
  );
}
