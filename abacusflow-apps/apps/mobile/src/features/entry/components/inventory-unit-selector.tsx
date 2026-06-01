import { useState, useEffect, useMemo } from "react";
import { View, TextInput, FlatList, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { translateInventoryUnitType } from "@abacusflow/utils";
import type { BasicInventoryUnit } from "@abacusflow/core";
import { inventoryApi } from "@abacusflow/core";
import { Text } from "@components/ui/text";
import { Button } from "@components/ui/button";
import { Badge } from "@components/ui/badge";
import { EmptyState } from "@components/ui/empty-state";
import { THEME } from "@lib/theme";

interface Props {
  visible: boolean;
  selectedIds: number[];
  onSelect: (unit: BasicInventoryUnit) => void;
  onClose: () => void;
}

export function InventoryUnitSelector({ visible, selectedIds, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<(BasicInventoryUnit & { _productName?: string })[]>([]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const res = await inventoryApi.listBasicInventoriesPage({ pageIndex: 1, pageSize: 100 });
        const allUnits = res.content.flatMap((inv) =>
          inv.units
            .filter((u) => (u.status === "normal" || u.status === "reversed") && u.remainingQuantity > 0)
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-card">
          <Text className="text-lg font-semibold">选择库存单元</Text>
          <Button variant="ghost" size="icon" onPress={onClose}>
            <Ionicons name="close" size={24} color={THEME.light.foreground} />
          </Button>
        </View>

        <View className="flex-row items-center gap-2 m-4 px-3 py-2.5 bg-card rounded-xl border border-border">
          <Ionicons name="search" size={18} color={THEME.light.mutedForeground} />
          <TextInput
            className="flex-1 text-base"
            value={search}
            onChangeText={setSearch}
            placeholder="搜索产品名 / SN / 批次码"
            placeholderTextColor={THEME.light.mutedForeground}
            autoFocus
          />
          {search.length > 0 && (
            <Button variant="ghost" size="icon" onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={THEME.light.mutedForeground} />
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
            contentContainerClassName="px-4 pb-6"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<EmptyState icon="file-tray-outline" message="暂无可售库存" />}
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item.id);
              const code = item.serialNumber || item.batchCode || item.title;
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
                    <Text className="text-base font-semibold">{item._productName}</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text variant="muted" className="text-sm">{code}</Text>
                      <Badge label={translateInventoryUnitType(item.type)} />
                    </View>
                    <Text variant="muted" className="text-xs mt-0.5">
                      可用: {item.remainingQuantity}{item.depotName ? ` · ${item.depotName}` : ""}
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
        )}
      </SafeAreaView>
    </Modal>
  );
}
