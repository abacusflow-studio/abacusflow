import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { partnerApi, type BasicSupplier } from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";
import { ListScreen } from "@components/layout/list-screen";

export default function SupplierListScreen() {
  const router = useRouter();
  const [data, setData] = useState<BasicSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (page = pageIndex) => {
      setLoading(true);
      try {
        const res = await partnerApi.listBasicSuppliersPage({
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

  const renderItem = (item: BasicSupplier) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/partner/supplier/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.totalOrderCount != null && (
          <Text style={styles.orderCount}>{item.totalOrderCount} 单</Text>
        )}
      </View>
      {item.contactPerson && (
        <Text style={styles.cardDetail}>联系人: {item.contactPerson}</Text>
      )}
      {item.phone && <Text style={styles.cardDetail}>电话: {item.phone}</Text>}
      {item.address && (
        <Text style={styles.cardDetail}>地址: {item.address}</Text>
      )}
      {item.totalOrderAmount != null && (
        <Text style={styles.cardAmount}>
          累计: ¥{item.totalOrderAmount.toLocaleString("zh-CN")}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ListScreen
      data={data}
      loading={loading}
      searchPlaceholder="搜索供应商名称"
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
      onAdd={() => router.push("/partner/supplier/add" as any)}
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
