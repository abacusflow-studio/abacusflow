import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, translateInventoryUnitType } from "@abacusflow/utils";
import type { BasicInventoryUnit } from "@abacusflow/core";
import { inventoryApi } from "@abacusflow/core";

interface Props {
  visible: boolean;
  selectedIds: number[];
  onSelect: (unit: BasicInventoryUnit) => void;
  onClose: () => void;
}

/** 可售库存单元选择器（出库用） */
export function InventoryUnitSelector({
  visible,
  selectedIds,
  onSelect,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<BasicInventoryUnit[]>([]);

  // 加载可售库存单元
  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const res = await inventoryApi.listBasicInventoriesPage({
          pageIndex: 1,
          pageSize: 100,
        });
        // 展开所有库存的 units，只保留可售的
        const allUnits = res.content.flatMap((inv) =>
          inv.units
            .filter(
              (u) =>
                (u.status === "normal" || u.status === "reversed") &&
                u.remainingQuantity > 0,
            )
            .map((u) => ({
              ...u,
              _productName: inv.productName,
              _productType: inv.productType,
            })),
        );
        setUnits(allUnits);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return units;
    const q = search.trim().toLowerCase();
    return units.filter(
      (u) =>
        u.title.toLowerCase().includes(q) ||
        (u.serialNumber && u.serialNumber.toLowerCase().includes(q)) ||
        (u.batchCode && u.batchCode.toLowerCase().includes(q)) ||
        (u as any)._productName?.toLowerCase().includes(q),
    );
  }, [units, search]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>选择库存单元</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="搜索产品名 / SN / 批次码"
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={COLORS.textDisabled}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>加载库存...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>暂无可售库存</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item.id);
              const code = item.serialNumber || item.batchCode || item.title;
              const productName = (item as any)._productName || "";
              return (
                <TouchableOpacity
                  style={[styles.item, isSelected && styles.itemSelected]}
                  onPress={() => {
                    if (!isSelected) {
                      onSelect(item);
                      onClose();
                    }
                  }}
                  disabled={isSelected}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{productName}</Text>
                    <View style={styles.itemMetaRow}>
                      <Text style={styles.itemCode}>{code}</Text>
                      <View style={styles.typeTag}>
                        <Text style={styles.typeTagText}>
                          {translateInventoryUnitType(item.type)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemStock}>
                      可用: {item.remainingQuantity}
                      {item.depotName ? ` · ${item.depotName}` : ""}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Text style={styles.addedText}>已添加</Text>
                  ) : (
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  title: { fontSize: 17, fontWeight: "600", color: COLORS.text },
  closeBtn: { padding: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  itemSelected: { opacity: 0.5 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  itemCode: { fontSize: 13, color: COLORS.textSecondary },
  typeTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  typeTagText: { fontSize: 11, color: COLORS.primary, fontWeight: "500" },
  itemStock: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  addedText: { fontSize: 13, color: COLORS.textDisabled },
  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: COLORS.textTertiary },
});
