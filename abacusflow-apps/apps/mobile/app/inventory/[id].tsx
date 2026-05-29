import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { inventoryApi, type BasicInventory } from "@abacusflow/core";
import { COLORS, translateProductType } from "@abacusflow/utils";
import { DetailScreen } from "@/components/ui";

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inventoryId = Number(id);
  const [data, setData] = useState<BasicInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingWarning, setEditingWarning] = useState(false);
  const [safetyStock, setSafetyStock] = useState("");
  const [maxStock, setMaxStock] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const page = await inventoryApi.listBasicInventoriesPage({
        pageIndex: 1,
        pageSize: 100,
      });
      const item = page.content.find(
        (inventory) => inventory.id === inventoryId,
      );
      setData(item ?? null);
      setSafetyStock(item?.safetyStock?.toString() ?? "");
      setMaxStock(item?.maxStock?.toString() ?? "");
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [inventoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getHealthStatus = (item: BasicInventory) => {
    if (item.safetyStock && item.quantity < item.safetyStock) {
      return { text: "低库存", color: COLORS.danger };
    }
    if (item.maxStock && item.quantity > item.maxStock) {
      return { text: "超量", color: COLORS.warning };
    }
    return { text: "正常", color: COLORS.success };
  };

  const handleUpdateWarning = async () => {
    const nextSafetyStock = safetyStock ? Number(safetyStock) : 0;
    const nextMaxStock = maxStock ? Number(maxStock) : 0;

    if (
      Number.isNaN(nextSafetyStock) ||
      Number.isNaN(nextMaxStock) ||
      nextSafetyStock < 0 ||
      nextMaxStock < 0
    ) {
      Alert.alert("提示", "预警线需为不小于 0 的数字");
      return;
    }

    try {
      await inventoryApi.adjustWarningLine({
        id: inventoryId,
        adjustWarningLineRequest: {
          safetyStock: nextSafetyStock,
          maxStock: nextMaxStock,
        },
      });
      setEditingWarning(false);
      loadData();
    } catch (error) {
      Alert.alert(
        "错误",
        error instanceof Error ? error.message : "更新预警线失败",
      );
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
        { label: "产品类型", value: translateProductType(d.productType) },
        { label: "当前数量", value: d.quantity },
        { label: "可用数量", value: d.remainingQuantity },
        { label: "初始数量", value: d.initialQuantity },
        { label: "规格", value: d.productSpecification },
        { label: "储存点", value: d.depotNames.join("、") || "未分配" },
      ]}
    >
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
  sectionTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  sectionAction: { fontSize: 14, color: COLORS.primary },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  formGroup: { gap: 12 },
  formRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  formLabel: { fontSize: 14, color: COLORS.text, width: 80 },
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
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
});
