import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";

import { useOrderRecords, type OrderFilter } from "../hooks/use-merged-orders";
import { OrderRecordCard } from "../components/order-record-card";

const FILTER_TABS: { key: OrderFilter; label: string; icon: string }[] = [
  { key: "sale", label: "出库", icon: "arrow-up-outline" },
  { key: "purchase", label: "入库", icon: "download-outline" },
];

export default function RecordsScreen() {
  const {
    records,
    loading,
    loadingMore,
    filter,
    setFilter,
    handleLoadMore,
    handleRefresh,
  } = useOrderRecords();

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="document-text-outline"
          size={48}
          color={COLORS.textDisabled}
        />
        <Text style={styles.emptyText}>
          {filter === "purchase" ? "暂无入库记录" : "暂无出库记录"}
        </Text>
        <Text style={styles.emptyHint}>
          完成{filter === "purchase" ? "入库" : "出库"}后，记录会显示在这里
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Segmented Control */}
      <View style={styles.segmentWrapper}>
        <View style={styles.segment}>
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={isActive ? COLORS.primary : COLORS.textTertiary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
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
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },

  // Segmented Control
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segmentTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: COLORS.bgCard,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textTertiary,
  },
  segmentTextActive: {
    color: COLORS.text,
    fontWeight: "600",
  },

  // List
  list: { padding: 16, gap: 12 },
  footer: { paddingVertical: 16, alignItems: "center" },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingTop: 80,
  },
  emptyText: { fontSize: 15, color: COLORS.textTertiary, marginTop: 8 },
  emptyHint: { fontSize: 13, color: COLORS.textDisabled },
});
