import { useEffect, useState } from "react";
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { productApi, type Product } from "@abacusflow/core";
import { translateProductType, translateProductUnit } from "@abacusflow/utils";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await productApi.getProduct(Number(id));
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("确认删除", "确定删除该产品？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            await productApi.deleteProduct(Number(id));
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
        <Text style={styles.errorText}>产品不存在</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.name}</Text>
          <View style={[styles.badge, { backgroundColor: data.enabled ? "#f6ffed" : "#fff1f0" }]}>
            <Text style={[styles.badgeText, { color: data.enabled ? "#52c41a" : "#ff4d4f" }]}>
              {data.enabled ? "启用" : "禁用"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <InfoItem label="类型" value={translateProductType(data.type)} />
          <InfoItem label="单位" value={translateProductUnit(data.unit)} />
          {data.categoryName && <InfoItem label="类别" value={data.categoryName} />}
          {data.specification && <InfoItem label="规格" value={data.specification} />}
          {data.barcode && <InfoItem label="条码" value={data.barcode} />}
          {data.note && <InfoItem label="备注" value={data.note} />}
          {data.createdAt && <InfoItem label="创建时间" value={data.createdAt} />}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => router.push(`/product/edit/${id}` as any)}
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 15, color: "#999" },
  content: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  name: { fontSize: 22, fontWeight: "700", color: "#333", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 13, fontWeight: "600" },
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
  actions: { flexDirection: "row", gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  editBtn: { backgroundColor: "#1677ff" },
  editBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  deleteBtn: { backgroundColor: "#fff1f0", borderWidth: 1, borderColor: "#ffccc7" },
  deleteBtnText: { color: "#ff4d4f", fontSize: 15, fontWeight: "600" },
});
