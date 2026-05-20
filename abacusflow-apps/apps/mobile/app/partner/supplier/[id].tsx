import { useEffect, useState } from "react";
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supplierApi, type Supplier } from "@abacusflow/core";

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const res = await supplierApi.getSupplier(Number(id));
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("确认删除", "确定删除该供应商？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            await supplierApi.deleteSupplier(Number(id));
            router.back();
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1677ff" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>供应商不存在</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{data.name}</Text>

        <View style={styles.card}>
          {data.contactPerson && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>联系人</Text>
              <Text style={styles.infoValue}>{data.contactPerson}</Text>
            </View>
          )}
          {data.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>电话</Text>
              <Text style={styles.infoValue}>{data.phone}</Text>
            </View>
          )}
          {data.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>邮箱</Text>
              <Text style={styles.infoValue}>{data.email}</Text>
            </View>
          )}
          {data.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>地址</Text>
              <Text style={styles.infoValue}>{data.address}</Text>
            </View>
          )}
          {data.totalOrders != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>历史订单数</Text>
              <Text style={styles.infoValue}>{data.totalOrders}</Text>
            </View>
          )}
          {data.totalAmount != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>历史总金额</Text>
              <Text style={[styles.infoValue, styles.amount]}>
                ¥{data.totalAmount.toLocaleString("zh-CN")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => router.push(`/partner/supplier/edit/${id}` as any)}
          >
            <Text style={styles.editBtnText}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>删除</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 15, color: "#999" },
  content: { padding: 16 },
  name: { fontSize: 22, fontWeight: "700", color: "#333", marginBottom: 16 },
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: { fontSize: 14, color: "#999" },
  infoValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  amount: { color: "#1677ff", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  editBtn: { backgroundColor: "#1677ff" },
  editBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  deleteBtn: { backgroundColor: "#fff1f0", borderWidth: 1, borderColor: "#ffccc7" },
  deleteBtnText: { color: "#ff4d4f", fontSize: 15, fontWeight: "600" },
});
