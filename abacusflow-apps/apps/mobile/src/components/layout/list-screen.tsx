import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@abacusflow/utils";

interface ListScreenProps<T> {
  data: T[];
  loading: boolean;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  renderItem: (item: T) => React.ReactElement;
  addLabel?: string;
  onAdd?: () => void;
  error?: string | null;
  onRetry?: () => void;
  keyExtractor: (item: T) => string;
}

export function ListScreen<T>({
  data,
  loading,
  searchPlaceholder = "搜索",
  searchValue,
  onSearchChange,
  onSearch,
  onRefresh,
  onLoadMore,
  hasMore,
  renderItem,
  addLabel,
  onAdd,
  error,
  onRetry,
  keyExtractor,
}: ListScreenProps<T>) {
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
              <Text style={styles.retryBtnText}>重试</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        {onAdd && (
          <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
            <Text style={styles.addBtnText}>{addLabel ?? "新增"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={({ item }) => renderItem(item)}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          onRefresh={onRefresh}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无数据</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity style={styles.loadMore} onPress={onLoadMore}>
                <Text style={styles.loadMoreText}>加载更多</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: {
    fontSize: 15,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  searchBar: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  empty: { paddingVertical: 60, alignItems: "center" },
  emptyText: { fontSize: 14, color: COLORS.textTertiary },
  loadMore: { paddingVertical: 16, alignItems: "center" },
  loadMoreText: { fontSize: 14, color: COLORS.primary },
});
