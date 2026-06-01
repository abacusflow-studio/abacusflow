import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";
import type { SelectableProduct } from "@abacusflow/core";

interface Props {
  visible: boolean;
  products: SelectableProduct[];
  selectedIds: number[];
  onSelect: (product: SelectableProduct) => void;
  onClose: () => void;
}

/** 手动选择产品弹窗 */
export function ProductSelector({
  visible,
  products,
  selectedIds,
  onSelect,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>选择产品</Text>
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
            placeholder="搜索产品名称 / 条码"
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
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>未找到产品</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
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
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.type === "asset" ? "资产" : "物料"} · {item.barcode}
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
  itemName: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  itemMeta: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  addedText: { fontSize: 13, color: COLORS.textDisabled },
  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: COLORS.textTertiary },
});
