import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { inventoryApi, type InventoryUnit } from "@abacusflow/core";
import { translateProductUnit } from "@abacusflow/utils";

export default function InventoryScreen() {
  const [data, setData] = useState<InventoryUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listInventoriesPage({ pageIndex: 1, pageSize: 50 });
      setData(res.content);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (item: InventoryUnit) => {
    if (item.safetyStock && item.quantity < item.safetyStock) return { text: "低库存", color: "#ff4d4f" };
    if (item.maxStock && item.quantity > item.maxStock) return { text: "超量", color: "#fa8c16" };
    return { text: "正常", color: "#52c41a" };
  };

  const renderItem = ({ item }: { item: InventoryUnit }) => {
    const health = getHealthStatus(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.productName}</Text>
          <View style={[styles.badge, { backgroundColor: health.color + "20" }]}>
            <Text style={[styles.badgeText, { color: health.color }]}>{health.text}</Text>
          </View>
        </View>
        <Text style={styles.cardDetail}>数量: {item.quantity} {translateProductUnit(item.productUnit)}</Text>
        {item.depotName && <Text style={styles.cardDetail}>储存点: {item.depotName}</Text>}
        {item.categoryName && <Text style={styles.cardDetail}>类别: {item.categoryName}</Text>}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1677ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onRefresh={loadData}
        refreshing={loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "500" },
  cardDetail: { fontSize: 13, color: "#666", marginTop: 2 },
});
