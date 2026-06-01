import { useMemo, useState } from "react";
import { FlatList, Modal, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { PressableScale } from "@components/ui/pressable-scale";
import { Text } from "@components/ui/text";
import { triggerHaptic } from "@lib/haptics";
import { THEME } from "@lib/theme";
import { cn } from "@lib/utils";
import type { PartnerOption } from "../types";

interface Props {
  partners: PartnerOption[];
  selectedId?: number;
  onSelect: (id: number) => void;
  label: string;
}

/** 可搜索的合作伙伴选择器 */
export function PartnerChipSelector({
  partners,
  selectedId,
  onSelect,
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = partners.find((partner) => partner.id === selectedId);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return partners;
    return partners.filter(
      (partner) =>
        partner.name.toLowerCase().includes(keyword) ||
        String(partner.id).includes(keyword),
    );
  }, [partners, search]);

  const handleSelect = (id: number) => {
    void triggerHaptic("selection");
    onSelect(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </Text>

      <PressableScale haptic="light" onPress={() => setOpen(true)}>
        <View
          className={cn(
            "min-h-[56px] flex-row items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3",
            selected && "border-primary/40 bg-primary/5",
          )}
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Ionicons
              name="business-outline"
              size={20}
              color={THEME.light.primary}
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground">
              {selected ? "当前选择" : "点击搜索选择"}
            </Text>
            <Text
              className={cn(
                "mt-1 text-base font-semibold",
                !selected && "text-muted-foreground",
              )}
              numberOfLines={1}
            >
              {selected?.name ?? "请选择"}
            </Text>
          </View>
          <Ionicons
            name="search-outline"
            size={20}
            color={THEME.light.mutedForeground}
          />
        </View>
      </PressableScale>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border bg-card px-4 py-3">
            <View>
              <Text className="text-lg font-bold">{label}</Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                共 {partners.length} 条，可按名称搜索
              </Text>
            </View>
            <Button variant="ghost" size="icon" onPress={() => setOpen(false)}>
              <Ionicons name="close" size={22} color={THEME.light.foreground} />
            </Button>
          </View>

          <View className="gap-3 p-4">
            <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card px-3">
              <Ionicons
                name="search"
                size={18}
                color={THEME.light.mutedForeground}
              />
              <Input
                className="h-12 flex-1 border-0 bg-transparent px-0 shadow-none"
                value={search}
                onChangeText={setSearch}
                placeholder="输入名称搜索"
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
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-2 px-4 pb-6"
            ListEmptyComponent={
              <View className="items-center gap-2 py-16">
                <Ionicons
                  name="search-outline"
                  size={36}
                  color={THEME.light.mutedForeground}
                />
                <Text className="text-sm text-muted-foreground">
                  没有找到匹配项
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const active = selectedId === item.id;
              return (
                <PressableScale
                  haptic="selection"
                  onPress={() => handleSelect(item.id)}
                >
                  <View
                    className={cn(
                      "flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4",
                      active && "border-primary bg-primary/10",
                    )}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <Text className="text-sm font-bold text-primary">
                        {item.name.slice(0, 1)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="mt-1 text-xs text-muted-foreground">
                        ID {item.id}
                      </Text>
                    </View>
                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={THEME.light.primary}
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={THEME.light.mutedForeground}
                      />
                    )}
                  </View>
                </PressableScale>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
