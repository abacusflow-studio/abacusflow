import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  inventoryApi,
  depotApi,
  type InventoryUnit,
  type BasicDepot,
} from "@abacusflow/core";
import {
  translateProductUnit,
  translateProductType,
  COLORS,
} from "@abacusflow/utils";
import { DetailScreen } from "@/components/detail-screen";

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      const [item, depotList] = await Promise.all([
        inventoryApi.getInventory(Number(id)),
        depotApi.listBasicDepots(),
      ]);
      setData(item);
      setDepots(depotList);
      setSelectedDepotId(item.depotId);
      setSafetyStock(item.safetyStock?.toString() ?? "");
      setMaxStock(item.maxStock?.toString() ?? "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (item: InventoryUnit) => {
    if (item.safetyStock && item.quantity < item.safetyStock)
      return { text: "低库存", color: COLORS.danger };
    if (item.maxStock && item.quantity > item.maxStock)
      return { text: "超量", color: COLORS.warning };
    return { text: "正常", color: COLORS.success };
  };

  const handleAssignDepot = async () => {
    if (!selectedDepotId) return;
    try {
      await inventoryApi.assignDepot({
        inventoryId: Number(id),
        depotId: selectedDepotId,
      });
      setEditingDepot(false);
      loadData();
    } catch {
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
    } catch {
      Alert.alert("错误", "更新预警线失败");
    }
  };

  return (
    <DetailScreen
      loading={loading}
      data={data}
      emptyMessage="库存记录不存在"
      title={(d) => d.productName}
      badge={(d) => {
        const health = getHealthStatus(d);
        return {
          text: health.text,
          color: health.color,
          bgColor: health.color + "20",
        };
      }}
      fields={(d) => [
        {
          label: "数量",
          value: `${d.quantity} ${translateProductUnit(d.productUnit)}`,
        },
        { label: "产品类型", value: translateProductType(d.productType) },
        { label: "类别", value: d.categoryName },
        { label: "储存点", value: d.depotName ?? "未分配" },
      ]}
    >
      {/* Warning Lines Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>预警线设置</Text>
        <TouchableOpacity onPress={() => setEditingWarning(!editingWarning)}>
          <Text style={styles.sectionAction}>
            {editingWarning ? "取消" : "编辑"}
          </Text>
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
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleUpdateWarning}
            >
              <Text style={styles.saveBtnText}>保存</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>安全库存</Text>
              <Text style={styles.infoValue}>{data?.safetyStock ?? "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>最大库存</Text>
              <Text style={styles.infoValue}>{data?.maxStock ?? "-"}</Text>
            </View>
          </>
        )}
      </View>

      {/* Assign Depot Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>分配储存点</Text>
        <TouchableOpacity onPress={() => setEditingDepot(!editingDepot)}>
          <Text style={styles.sectionAction}>
            {editingDepot ? "取消" : "编辑"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {editingDepot ? (
          <View style={styles.formGroup}>
            {depots.map((depot) => (
              <TouchableOpacity
                key={depot.id}
                style={[
                  styles.depotOption,
                  selectedDepotId === depot.id && styles.depotOptionSelected,
                ]}
                onPress={() => setSelectedDepotId(depot.id)}
              >
                <Text
                  style={[
                    styles.depotOptionText,
                    selectedDepotId === depot.id &&
                      styles.depotOptionTextSelected,
                  ]}
                >
                  {depot.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleAssignDepot}
            >
              <Text style={styles.saveBtnText}>保存</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>当前储存点</Text>
            <Text style={styles.infoValue}>{data?.depotName ?? "未分配"}</Text>
          </View>
        )}
      </View>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  sectionAction: { fontSize: 14, color: COLORS.primary },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formGroup: { gap: 12 },
  formRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  formLabel: { fontSize: 14, color: "#333", width: 80 },
  formInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: 14, color: COLORS.textTertiary },
  infoValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  depotOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  depotOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  depotOptionText: { fontSize: 14, color: "#333" },
  depotOptionTextSelected: { color: COLORS.primary, fontWeight: "600" },
});
