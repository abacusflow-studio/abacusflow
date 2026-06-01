import { useEffect, useState, useCallback } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { partnerApi, type BasicCustomer } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Badge } from "@components/ui/badge";
import { THEME } from "@lib/theme";
import { ListScreen } from "@components/layout/list-screen";

export default function CustomerListScreen() {
  const router = useRouter();
  const [data, setData] = useState<BasicCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (page = pageIndex) => {
      setLoading(true);
      try {
        const res = await partnerApi.listBasicCustomersPage({
          pageIndex: page,
          pageSize: 20,
          name: searchName || undefined,
        });
        setData(res.content);
        setTotal(res.totalElements);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [pageIndex, searchName],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = () => {
    setPageIndex(1);
    loadData(1);
  };

  const renderItem = (item: BasicCustomer) => (
    <View className="py-1.5">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-base font-semibold flex-1">{item.name}</Text>
        {item.totalOrderCount != null && item.totalOrderCount > 0 && (
          <Badge
            label={`${item.totalOrderCount} 单`}
            color={THEME.light.primary}
            bgColor={THEME.light.primary + "20"}
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
      onRefresh={() => {
        setPageIndex(1);
        loadData(1);
      }}
      onLoadMore={() => setPageIndex((p) => p + 1)}
      hasMore={total > pageIndex * 20}
      renderItem={renderItem}
      addLabel="新增"
      onAdd={() => router.push("/partner/customer/add" as any)}
      keyExtractor={(item) => String(item.id)}
    />
  );
}
