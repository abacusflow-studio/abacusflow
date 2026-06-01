import { View, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";

import { useMergedOrders } from "../hooks/use-merged-orders";
import { OrderRecordCard } from "../components/order-record-card";

export default function RecordsScreen() {
  const {
    records,
    loading,
    loadingMore,
    handleLoadMore,
    handleRefresh,
  } = useMergedOrders();

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="document-text-outline"
            size={48}
            color={COLORS.textDisabled}
          />
          <Text style={styles.emptyText}>暂无流水记录</Text>
          <Text style={styles.emptyHint}>
            完成入库或出库后，记录会显示在这里
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={({ item }) => <OrderRecordCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={handleRefresh}
          refreshing={loading}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  list: { padding: 16, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textTertiary, marginTop: 8 },
  emptyHint: { fontSize: 13, color: COLORS.textDisabled },
  footer: { paddingVertical: 16, alignItems: "center" },
});
