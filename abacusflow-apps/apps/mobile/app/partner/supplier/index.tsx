import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supplierApi, type Supplier } from "@abacusflow/core";

export default function SupplierListScreen() {
  const router = useRouter();
  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [pageIndex]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await supplierApi.listSuppliersPage({
        pageIndex,
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
  };

  const handleSearch = () => {
    setPageIndex(1);
    loadData();
  };

  const renderItem = ({ item }: { item: Supplier }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/partner/supplier/${item.id}` as any)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.totalOrders != null && (
          <Text style={styles.orderCount}>{item.totalOrders} 单</Text>
        )}
      </View>
      {item.contactPerson && <Text style={styles.cardDetail}>联系人: {item.contactPerson}</Text>}
      {item.phone && <Text style={styles.cardDetail}>电话: {item.phone}</Text>}
      {item.email && <Text style={styles.cardDetail}>邮箱: {item.email}</Text>}
      {item.address && <Text style={styles.cardDetail}>地址: {item.address}</Text>}
      {item.totalAmount != null && (
        <Text style={styles.cardAmount}>累计: ¥{item.totalAmount.toLocaleString("zh-CN")}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={searchName}
          onChangeText={setSearchName}
          placeholder="搜索供应商名称"
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/partner/supplier/add" as any)}>
          <Text style={styles.addBtnText}>新增</Text>
        </TouchableOpacity>
      </View>

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
  searchBar: { flexDirection: "row", padding: 16, gap: 12, backgroundColor: "#fff" },
  searchInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: "#1677ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
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
  orderCount: { fontSize: 12, color: "#1677ff", backgroundColor: "#e6f4ff", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  cardDetail: { fontSize: 13, color: "#666", marginTop: 2 },
  cardAmount: { fontSize: 14, fontWeight: "600", color: "#1677ff", marginTop: 8 },
  loadMore: { paddingVertical: 16, alignItems: "center" },
  loadMoreText: { fontSize: 14, color: "#1677ff" },
});
