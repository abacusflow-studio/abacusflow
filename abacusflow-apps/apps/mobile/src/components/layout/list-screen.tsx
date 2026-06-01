import React from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@components/ui/button";
import { EmptyState } from "@components/ui/empty-state";
import { ErrorState } from "@components/ui/error-state";
import { Input } from "@components/ui/input";
import { Text } from "@components/ui/text";
import { THEME } from "@lib/theme";

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
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <ErrorState message={error} onRetry={onRetry} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row gap-3 border-b border-border bg-card p-4">
        <Input
          className="h-11 flex-1 rounded-lg bg-background"
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        {onAdd && (
          <Button className="h-11 px-4" onPress={onAdd}>
            <Text>{addLabel ?? "新增"}</Text>
          </Button>
        )}
      </View>

      {loading && data.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={THEME.light.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={({ item }) => renderItem(item)}
          keyExtractor={keyExtractor}
          contentContainerClassName="gap-3 p-4"
          onRefresh={onRefresh}
          refreshing={loading}
          ListEmptyComponent={<EmptyState message="暂无数据" />}
          ListFooterComponent={
            hasMore ? (
              <Button
                variant="ghost"
                className="my-2 h-12"
                onPress={onLoadMore}
              >
                <Text>加载更多</Text>
              </Button>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
