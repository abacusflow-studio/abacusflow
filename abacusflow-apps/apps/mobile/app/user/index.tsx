import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import { userApi, type User } from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";
import { ListScreen } from "@/components/list-screen";

export default function UserListScreen() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (page = pageIndex) => {
      setLoading(true);
      try {
        const res = await userApi.listUsersPage({
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

  const renderItem = (item: User) => (
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
      {item.age != null && (
        <Text style={styles.cardDetail}>年龄: {item.age}</Text>
      )}
      {item.sex && <Text style={styles.cardDetail}>性别: {item.sex}</Text>}
      {item.name !== "admin" && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Text style={styles.deleteBtnText}>删除</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ListScreen
      data={data}
      loading={loading}
      searchPlaceholder="搜索用户名称"
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
  adminBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: { fontSize: 12, color: COLORS.primary, fontWeight: "500" },
  cardDetail: { fontSize: 13, color: "#666", marginTop: 2 },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.dangerLight,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  deleteBtnText: { color: COLORS.danger, fontSize: 13, fontWeight: "500" },
});
