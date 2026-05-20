import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { userApi, type User } from "@abacusflow/core";

export default function UserListScreen() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [pageIndex]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await userApi.listUsersPage({ pageIndex, pageSize: 20 });
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (name === "admin") {
      Alert.alert("提示", "不能删除管理员用户");
      return;
    }
    Alert.alert("确认删除", "确定删除该用户？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            await userApi.deleteUser(id);
            loadData();
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.name === "admin" && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>管理员</Text>
          </View>
        )}
      </View>
      {item.nick && <Text style={styles.cardDetail}>昵称: {item.nick}</Text>}
      {item.age != null && <Text style={styles.cardDetail}>年龄: {item.age}</Text>}
      {item.sex && <Text style={styles.cardDetail}>性别: {item.sex}</Text>}
      {item.name !== "admin" && (
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.name)}>
          <Text style={styles.deleteBtnText}>删除</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1677ff" />
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          onRefresh={() => { setPageIndex(1); loadData(); }}
          refreshing={loading}
          ListFooterComponent={
            total > pageIndex * 20 ? (
              <TouchableOpacity style={styles.loadMore} onPress={() => setPageIndex((p) => p + 1)}>
                <Text style={styles.loadMoreText}>加载更多</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
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
  adminBadge: { backgroundColor: "#e6f4ff", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  adminBadgeText: { fontSize: 12, color: "#1677ff", fontWeight: "500" },
  cardDetail: { fontSize: 13, color: "#666", marginTop: 2 },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fff1f0",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  deleteBtnText: { color: "#ff4d4f", fontSize: 13, fontWeight: "500" },
  loadMore: { paddingVertical: 16, alignItems: "center" },
  loadMoreText: { fontSize: 14, color: "#1677ff" },
});
