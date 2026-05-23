import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { partnerApi, type Customer } from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";
import { ListScreen } from "@abacusflow/ui-native";

export default function CustomerListScreen() {
  const router = useRouter();
  const [data, setData] = useState<Customer[]>([]);
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

  const renderItem = (item: Customer) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/partner/customer/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.totalOrders != null && (
          <Text style={styles.orderCount}>{item.totalOrders} 单</Text>
        )}
      </View>
      {item.phone && <Text style={styles.cardDetail}>电话: {item.phone}</Text>}
      {item.address && (
        <Text style={styles.cardDetail}>地址: {item.address}</Text>
      )}
      {item.totalAmount != null && (
        <Text style={styles.cardAmount}>
          累计: ¥{item.totalAmount.toLocaleString("zh-CN")}
        </Text>
      )}
    </TouchableOpacity>
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

const styles = StyleSheet.create({
  card: { paddingVertical: 4 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  orderCount: {
    fontSize: 12,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardDetail: { fontSize: 13, color: "#666", marginTop: 2 },
  cardAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 8,
  },
});
