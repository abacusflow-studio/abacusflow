import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { productApi, type BasicProduct } from "@abacusflow/core";
import {
  translateProductType,
  translateProductUnit,
  COLORS,
} from "@abacusflow/utils";
import { ListScreen } from "@/components/ui";

export default function ProductsScreen() {
  const router = useRouter();
  const [data, setData] = useState<BasicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (page = pageIndex) => {
      setLoading(true);
      try {
        const res = await productApi.listBasicProductsPage({
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

  const renderItem = (item: BasicProduct) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/product/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: item.enabled ? "#f6ffed" : "#fff1f0" },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: item.enabled ? COLORS.success : COLORS.danger },
            ]}
          >
            {item.enabled ? "启用" : "禁用"}
          </Text>
        </View>
      </View>
      <Text style={styles.cardDetail}>
        类型: {translateProductType(item.type)}
      </Text>
      <Text style={styles.cardDetail}>
        单位: {translateProductUnit(item.unit)}
      </Text>
      {item.categoryName && (
        <Text style={styles.cardDetail}>类别: {item.categoryName}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ListScreen
      data={data}
      loading={loading}
      searchPlaceholder="搜索产品名称"
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
      onAdd={() => router.push("/product/add" as any)}
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
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "500" },
  cardDetail: { fontSize: 13, color: "#666", marginTop: 2 },
});
