import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { depotApi, type BasicDepot } from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";
import { ListScreen } from "@/components/list-screen";

export default function DepotsScreen() {
  const router = useRouter();
  const [data, setData] = useState<BasicDepot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await depotApi.listBasicDepots();
      setData(res);
    } catch (err) {
      setError("加载失败");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = searchName
    ? data.filter((d) => d.name.includes(searchName))
    : data;

  const renderItem = (item: BasicDepot) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/depot/${item.id}` as any)}
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
      {item.location && (
        <Text style={styles.cardDetail}>地址: {item.location}</Text>
      )}
      {item.capacity != null && (
        <Text style={styles.cardDetail}>容量: {item.capacity}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ListScreen
      data={filtered}
      loading={loading}
      searchPlaceholder="搜索储存点名称"
      searchValue={searchName}
      onSearchChange={setSearchName}
      onSearch={() => {}}
      onRefresh={loadData}
      renderItem={renderItem}
      addLabel="新增"
      onAdd={() => router.push("/depot/add" as any)}
      error={error}
      onRetry={loadData}
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
