import { useEffect, useState } from "react";
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { inventoryApi, depotApi, type InventoryUnit, type BasicDepot } from "@abacusflow/core";
import { translateProductUnit, translateProductType } from "@abacusflow/utils";

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<InventoryUnit | null>(null);
  const [depots, setDepots] = useState<BasicDepot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDepot, setEditingDepot] = useState(false);
  const [editingWarning, setEditingWarning] = useState(false);
  const [selectedDepotId, setSelectedDepotId] = useState<number | undefined>();
  const [safetyStock, setSafetyStock] = useState("");
  const [maxStock, setMaxStock] = useState("");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [inventories, depotList] = await Promise.all([
        inventoryApi.listInventoriesPage({ pageIndex: 1, pageSize: 100 }),
        depotApi.listBasicDepots(),
      ]);
      const item = inventories.content.find((i) => i.id === Number(id));
      setData(item ?? null);
      setDepots(depotList);
      if (item) {
        setSelectedDepotId(item.depotId);
        setSafetyStock(item.safetyStock?.toString() ?? "");
        setMaxStock(item.maxStock?.toString() ?? "");
      }
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

  const handleAssignDepot = async () => {
    if (!selectedDepotId) return;
    try {
      await inventoryApi.assignDepot({ inventoryId: Number(id), depotId: selectedDepotId });
      setEditingDepot(false);
      loadData();
    } catch (err) {
      Alert.alert("错误", "分配储存点失败");
    }
  };

  const handleUpdateWarning = async () => {
    try {
      await inventoryApi.updateWarningLine({
        inventoryId: Number(id),
        safetyStock: safetyStock ? Number(safetyStock) : undefined,
        maxStock: maxStock ? Number(maxStock) : undefined,
      });
      setEditingWarning(false);
      loadData();
    } catch (err) {
      Alert.alert("错误", "更新预警线失败");
    }
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
        <Text style={styles.errorText}>库存记录不存在</Text>
      </View>
    );
  }

  const health = getHealthStatus(data);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.productName}</Text>
          <View style={[styles.badge, { backgroundColor: health.color + "20" }]}>
            <Text style={[styles.badgeText, { color: health.color }]}>{health.text}</Text>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>数量</Text>
            <Text style={styles.infoValue}>{data.quantity} {translateProductUnit(data.productUnit)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>产品类型</Text>
            <Text style={styles.infoValue}>{translateProductType(data.productType)}</Text>
          </View>
          {data.categoryName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>类别</Text>
              <Text style={styles.infoValue}>{data.categoryName}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>储存点</Text>
            <Text style={styles.infoValue}>{data.depotName ?? "未分配"}</Text>
          </View>
        </View>

        {/* Warning Lines */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>预警线设置</Text>
          <TouchableOpacity onPress={() => setEditingWarning(!editingWarning)}>
            <Text style={styles.sectionAction}>{editingWarning ? "取消" : "编辑"}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {editingWarning ? (
            <View style={styles.formGroup}>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>安全库存</Text>
                <TextInput
                  style={styles.formInput}
                  value={safetyStock}
                  onChangeText={setSafetyStock}
                  keyboardType="numeric"
                  placeholder="最低库存量"
                />
              </View>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>最大库存</Text>
                <TextInput
                  style={styles.formInput}
                  value={maxStock}
                  onChangeText={setMaxStock}
                  keyboardType="numeric"
                  placeholder="最大库存量"
                />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateWarning}>
                <Text style={styles.saveBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>安全库存</Text>
                <Text style={styles.infoValue}>{data.safetyStock ?? "-"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>最大库存</Text>
                <Text style={styles.infoValue}>{data.maxStock ?? "-"}</Text>
              </View>
            </>
          )}
        </View>

        {/* Assign Depot */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>分配储存点</Text>
          <TouchableOpacity onPress={() => setEditingDepot(!editingDepot)}>
            <Text style={styles.sectionAction}>{editingDepot ? "取消" : "编辑"}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {editingDepot ? (
            <View style={styles.formGroup}>
              {depots.map((depot) => (
                <TouchableOpacity
                  key={depot.id}
                  style={[styles.depotOption, selectedDepotId === depot.id && styles.depotOptionSelected]}
                  onPress={() => setSelectedDepotId(depot.id)}
                >
                  <Text style={[styles.depotOptionText, selectedDepotId === depot.id && styles.depotOptionTextSelected]}>
                    {depot.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.saveBtn} onPress={handleAssignDepot}>
                <Text style={styles.saveBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>当前储存点</Text>
              <Text style={styles.infoValue}>{data.depotName ?? "未分配"}</Text>
            </View>
          )}
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
    marginBottom: 16,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  sectionAction: { fontSize: 14, color: "#1677ff" },
  formGroup: { gap: 12 },
  formRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  formLabel: { fontSize: 14, color: "#333", width: 80 },
  formInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d9d9d9",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: "#1677ff",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  depotOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d9d9d9",
  },
  depotOptionSelected: { borderColor: "#1677ff", backgroundColor: "#e6f4ff" },
  depotOptionText: { fontSize: 14, color: "#333" },
  depotOptionTextSelected: { color: "#1677ff", fontWeight: "600" },
});
