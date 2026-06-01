import { FlatList, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, translateProductType, translateProductUnit } from "@abacusflow/utils";
import type { BasicProduct } from "@abacusflow/core";

interface Props {
  data: BasicProduct[];
  loading: boolean;
  searched: boolean;
  onRefresh: () => void;
  onPress: (item: BasicProduct) => void;
}

/** 产品搜索结果列表 */
export function ProductResults({
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
            <Text style={styles.emptyText}>未找到产品</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onPress(item)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardBarcode}>{item.barcode}</Text>
          </View>
          <Text style={styles.cardDetail}>
            {translateProductType(item.type)} ·{" "}
            {translateProductUnit(item.unit)}
            {item.categoryName ? ` · ${item.categoryName}` : ""}
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
