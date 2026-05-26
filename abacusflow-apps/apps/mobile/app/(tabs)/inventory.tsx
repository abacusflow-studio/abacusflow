import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { inventoryApi, type BasicInventory } from "@abacusflow/core";
import { translateProductType, COLORS } from "@abacusflow/utils";
import { ListScreen } from "@abacusflow/ui-native";

export default function InventoryScreen() {
  const router = useRouter();
  const [data, setData] = useState<BasicInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (page = pageIndex) => {
      setLoading(true);
      try {
        const res = await inventoryApi.listBasicInventoriesPage({
          pageIndex: page,
          pageSize: 20,
          productName: searchName || undefined,
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

  const getHealthStatus = (item: BasicInventory) => {
    if (item.safetyStock && item.quantity < item.safetyStock)
      return { text: "低库存", color: COLORS.danger };
    if (item.maxStock && item.quantity > item.maxStock)
      return { text: "超量", color: COLORS.warning };
    return { text: "正常", color: COLORS.success };
  };

  const renderItem = (item: BasicInventory) => {
    const health = getHealthStatus(item);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/inventory/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.productName}</Text>
          <View
            style={[styles.badge, { backgroundColor: health.color + "20" }]}
          >
            <Text style={[styles.badgeText, { color: health.color }]}>
              {health.text}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDetail}>
          数量: {item.quantity} · 可用: {item.remainingQuantity}
        </Text>
        <Text style={styles.cardDetail}>
          类型: {translateProductType(item.productType)}
        </Text>
        {item.depotNames.length > 0 && (
          <Text style={styles.cardDetail}>
            储存点: {item.depotNames.join("、")}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

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
