import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { depotApi, type BasicDepot } from "@abacusflow/core";

export default function DepotsScreen() {
  const [data, setData] = useState<BasicDepot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await depotApi.listBasicDepots();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: BasicDepot }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={[styles.badge, { backgroundColor: item.enabled ? "#f6ffed" : "#fff1f0" }]}>
          <Text style={[styles.badgeText, { color: item.enabled ? "#52c41a" : "#ff4d4f" }]}>
            {item.enabled ? "启用" : "禁用"}
          </Text>
        </View>
      </View>
      {item.location && <Text style={styles.cardDetail}>地址: {item.location}</Text>}
      {item.capacity != null && <Text style={styles.cardDetail}>容量: {item.capacity}</Text>}
    </View>
  );

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
