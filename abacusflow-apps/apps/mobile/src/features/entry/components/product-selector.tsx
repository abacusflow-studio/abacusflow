import { useState, useMemo } from "react";
import { View, TextInput, FlatList, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { THEME } from "@lib/theme";
import { EmptyState } from "@components/ui/empty-state";
import type { SelectableProduct } from "@abacusflow/core";

interface Props {
  visible: boolean;
  products: SelectableProduct[];
  selectedIds: number[];
  onSelect: (product: SelectableProduct) => void;
  onClose: () => void;
}

export function ProductSelector({ visible, products, selectedIds, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-card">
          <Text className="text-lg font-semibold">选择产品</Text>
          <Button variant="ghost" size="icon" onPress={onClose}>
            <Ionicons name="close" size={24} color={THEME.light.foreground} />
          </Button>
        </View>

        {/* Search */}
        <View className="flex-row items-center gap-2 m-4 px-3 py-2.5 bg-card rounded-xl border border-border">
          <Ionicons name="search" size={18} color={THEME.light.mutedForeground} />
          <TextInput
            className="flex-1 text-base"
            value={search}
            onChangeText={setSearch}
            placeholder="搜索产品名称 / 条码"
            placeholderTextColor={THEME.light.mutedForeground}
            autoFocus
          />
          {search.length > 0 && (
            <Button variant="ghost" size="icon" onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={THEME.light.mutedForeground} />
            </Button>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="px-4 pb-6"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyState icon="cube-outline" message="未找到产品" />}
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <Button
                variant="ghost"
                onPress={() => {
                  if (!isSelected) {
                    onSelect(item);
                    onClose();
                  }
                }}
                disabled={isSelected}
                className="flex-row items-center py-3.5 px-1 border-b border-border"
              >
                <View className="flex-1">
                  <Text className="text-base font-medium">{item.name}</Text>
                  <Text variant="muted" className="text-xs mt-0.5">
                    {item.type === "asset" ? "资产" : "物料"} · {item.barcode}
                  </Text>
                </View>
                {isSelected ? (
                  <Text variant="muted">已添加</Text>
                ) : (
                  <Ionicons name="add-circle-outline" size={22} color={THEME.light.primary} />
                )}
              </Button>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
