import { FlatList, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "@abacusflow/utils";
import type { BasicInventory } from "@abacusflow/core";

interface Props {
  data: BasicInventory[];
  loading: boolean;
  searched: boolean;
  onRefresh: () => void;
  onPress: (item: BasicInventory) => void;
}

/** 库存搜索结果列表 */
export function InventoryResults({
  data,
  loading,
  searched,
  onRefresh,
  onPress,
}: Props) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      onRefresh={onRefresh}
      refreshing={loading}
      ListEmptyComponent={
        searched ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>未找到库存</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onPress(item)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.productName}</Text>
            <Text style={styles.cardBarcode}>
              {item.productType === "asset" ? "资产" : "物料"}
            </Text>
          </View>
          <Text style={styles.cardDetail}>
            库存: {item.quantity}
            {item.depotNames?.length
              ? ` · ${item.depotNames.join(", ")}`
              : ""}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  cardBarcode: { fontSize: 12, color: COLORS.textTertiary },
  cardDetail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: COLORS.textTertiary },
});
