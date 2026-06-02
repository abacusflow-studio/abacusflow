import { useState, useMemo } from "react";
import {
  View,
  TextInput,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { PressableScale } from "@components/ui/pressable-scale";
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
        p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-card">
          <Text className="text-lg font-semibold">选择产品</Text>
          <Button variant="ghost" size="icon" onPress={onClose}>
            <Ionicons name="close" size={24} color={THEME.light.foreground} />
          </Button>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Search */}
          <View className="flex-row items-center gap-2 m-4 px-3 py-2.5 bg-card rounded-xl border border-border">
            <Ionicons
              name="search"
              size={18}
              color={THEME.light.mutedForeground}
            />
            <TextInput
              className="min-w-0 flex-1 text-base"
              value={search}
              onChangeText={setSearch}
              placeholder="搜索产品名称 / 条码"
              placeholderTextColor={THEME.light.mutedForeground}
              autoFocus
            />
            {search.length > 0 && (
              <Button variant="ghost" size="icon" onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={THEME.light.mutedForeground}
                />
              </Button>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerClassName="gap-3 px-4 pb-6"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <EmptyState icon="cube-outline" message="未找到产品" />
            }
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <PressableScale
                  disabled={isSelected}
                  haptic={isSelected ? false : "selection"}
                  scaleTo={0.99}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <View className="min-h-16 flex-row items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-base font-medium" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text
                        variant="muted"
                        className="mt-1 text-xs"
                        numberOfLines={1}
                      >
                        {item.type === "asset" ? "资产" : "物料"} ·{" "}
                        {item.barcode}
                      </Text>
                    </View>
                    <View className="min-w-[56px] items-end justify-center">
                      {isSelected ? (
                        <Text variant="muted" className="text-xs">
                          已添加
                        </Text>
                      ) : (
                        <Ionicons
                          name="add-circle-outline"
                          size={22}
                          color={THEME.light.primary}
                        />
                      )}
                    </View>
                  </View>
                </PressableScale>
              );
            }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
