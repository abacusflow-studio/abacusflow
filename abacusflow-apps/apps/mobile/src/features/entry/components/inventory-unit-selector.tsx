import { useState, useEffect, useMemo } from "react";
import {
  View,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { translateInventoryUnitType } from "@abacusflow/utils";
import type { BasicInventoryUnit } from "@abacusflow/core";
import { inventoryApi } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/empty-state";
import { PressableScale } from "@components/ui/pressable-scale";
import { THEME } from "@lib/theme";

interface Props {
  visible: boolean;
  selectedIds: number[];
  onSelect: (unit: BasicInventoryUnit) => void;
  onClose: () => void;
}

export function InventoryUnitSelector({
  visible,
  selectedIds,
  onSelect,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<
    (BasicInventoryUnit & { _productName?: string })[]
  >([]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const res = await inventoryApi.listBasicInventoriesPage({
          pageIndex: 1,
          pageSize: 50,
        });
        const allUnits = res.content.flatMap((inv) =>
          inv.units
            .filter(
              (u) =>
                (u.status === "normal" || u.status === "reversed") &&
                u.remainingQuantity > 0,
            )
            .map((u) => ({ ...u, _productName: inv.productName })),
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
        u._productName?.toLowerCase().includes(q),
    );
  }, [units, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-card">
          <Text className="text-lg font-semibold">选择库存单元</Text>
          <Button variant="ghost" size="icon" onPress={onClose}>
            <Ionicons name="close" size={24} color={THEME.light.foreground} />
          </Button>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
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
              placeholder="搜索产品名 / SN / 批次码"
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

          {loading ? (
            <View className="flex-1 items-center justify-center gap-2">
              <ActivityIndicator size="large" color={THEME.light.primary} />
              <Text variant="muted">加载库存...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              contentContainerClassName="gap-3 px-4 pb-6"
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <EmptyState icon="file-tray-outline" message="暂无可售库存" />
              }
              renderItem={({ item }) => {
                const isSelected = selectedIds.includes(item.id);
                const code = item.serialNumber || item.batchCode || item.title;
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
                    <View className="min-h-20 flex-row items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-base font-semibold"
                          numberOfLines={1}
                        >
                          {item._productName || item.title}
                        </Text>
                        <View className="mt-1 flex-row items-center gap-2">
                          <Text
                            variant="muted"
                            className="min-w-0 flex-1 text-sm"
                            numberOfLines={1}
                          >
                            {code}
                          </Text>
                          <Badge
                            label={translateInventoryUnitType(item.type)}
                          />
                        </View>
                        <Text
                          variant="muted"
                          className="mt-1 text-xs"
                          numberOfLines={1}
                        >
                          可用: {item.remainingQuantity}
                          {item.depotName ? ` · ${item.depotName}` : ""}
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
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
